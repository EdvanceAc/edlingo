import { memo, useEffect, useRef } from "react";
import vegaEmbed, { Result } from "vega-embed";
import { useSessionInsightsStore, VolumeSample } from "../../lib/session-insights-store";

function toRows(samples: VolumeSample[]) {
  return samples.map((s) => ({ t: new Date(s.t).toISOString(), mic: s.mic, out: s.out }));
}

function InsightsChartsComponent() {
  const embedRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<Result | null>(null);
  const { samples } = useSessionInsightsStore();

  // initialize the embedded Vega-Lite chart once
  useEffect(() => {
    if (!embedRef.current) return;

    const spec: any = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 240,
      background: "transparent",
      padding: 8,
      data: { name: "values" },
      transform: [
        { fold: ["mic", "out"], as: ["source", "vol"] },
      ],
      layer: [
        {
          mark: { type: "line", interpolate: "monotone" },
          encoding: {
            x: { field: "t", type: "temporal", title: "Time" },
            y: { field: "vol", type: "quantitative", title: "Volume", scale: { domain: [0, 0.5] } },
            color: {
              field: "source",
              type: "nominal",
              scale: { domain: ["mic", "out"], range: ["#60A5FA", "#F59E0B"] },
              title: "Channel",
            },
            tooltip: [
              { field: "source", type: "nominal", title: "Channel" },
              { field: "vol", type: "quantitative", title: "Volume" },
              { field: "t", type: "temporal", title: "Time" },
            ],
          },
        },
        // user speaking threshold
        {
          mark: { type: "rule", strokeDash: [4, 4], color: "#60A5FA" },
          encoding: { y: { datum: 0.02 } },
        },
        // assistant speaking threshold
        {
          mark: { type: "rule", strokeDash: [4, 4], color: "#F59E0B" },
          encoding: { y: { datum: 0.02 } },
        },
      ],
      config: {
        axis: { labelColor: "#e5e7eb", titleColor: "#e5e7eb" },
        legend: { labelColor: "#e5e7eb", titleColor: "#e5e7eb" },
      },
    };

    vegaEmbed(embedRef.current, spec, { actions: false }).then((res) => {
      viewRef.current = res;
      const rows = toRows(samples);
      res.view.data("values", rows).run();
    });

    return () => {
      viewRef.current = null;
      if (embedRef.current) {
        embedRef.current.innerHTML = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update the dataset when samples change
  useEffect(() => {
    const view = viewRef.current?.view;
    if (view) {
      view.data("values", toRows(samples)).run();
    }
  }, [samples]);

  return <div className="vega-embed" ref={embedRef} />;
}

export const InsightsCharts = memo(InsightsChartsComponent);