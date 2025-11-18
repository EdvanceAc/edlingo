import React, { useState, useEffect } from 'react';
import { pdfjs } from 'react-pdf';
import { Document, Page } from 'react-pdf';
import TestSystem from './TestSystem';
import usePersonalization from '../../hooks/usePersonalization';
import { useSupabaseGeminiService } from '../../services/supabaseGeminiService';
import { useToast } from '../../hooks/use-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const LessonViewer = ({ lesson }) => {
  const { userLevel } = usePersonalization();
  const geminiService = useSupabaseGeminiService();
  const { info: toastInfo, error: toastError } = useToast();

  const [simplifiedText, setSimplifiedText] = useState('');
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const simplifyText = async () => {
      try {
        const response = await geminiService.simplifyText(lesson.text, userLevel);
        setSimplifiedText(response);
      } catch (e) {
        console.error('Failed to simplify text', e);
        toastError('Failed to simplify the lesson text.');
      }
    };
    if (lesson?.text) {
      simplifyText();
    }
  }, [lesson, userLevel, geminiService, toastError]);

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  const handleHighlightClick = (highlight) => {
    const synonym = highlight?.synonym || 'No synonym available';
    toastInfo(`Synonym: ${synonym}`);
  };

  const handlePronunciationPractice = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toastError('Speech recognition not supported in this browser.');
      return;
    }

    try {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onresult = async (event) => {
        try {
          const spokenText = event.results[0][0].transcript;
          const response = await geminiService.getPronunciationFeedback(spokenText, lesson.text);
          setFeedback(response);
        } catch (e) {
          console.error('Pronunciation feedback failed', e);
          toastError('Failed to analyze pronunciation.');
        }
      };

      recognition.start();
    } catch (e) {
      console.error('Speech recognition failed to start', e);
      toastError('Could not start speech recognition.');
    }
  };

  return (
    <div className="lesson-viewer">
      <h2>{lesson.title}</h2>

      {lesson.audioUrl && <audio controls src={lesson.audioUrl} />}
      {lesson.videoUrl && <video controls src={lesson.videoUrl} />}

      <p>{simplifiedText}</p>

      {lesson.pdfUrl && (
        <Document file={lesson.pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} />
          {(lesson.highlights || []).map((highlight, index) => (
            <div
              key={index}
              onClick={() => handleHighlightClick(highlight)}
              style={{ position: 'absolute', ...(highlight.position || {}) }}
            >
              {highlight.text}
            </div>
          ))}
        </Document>
      )}

      <p>
        Page {numPages ? pageNumber : 0} of {numPages || 0}
      </p>

      <TestSystem quiz={lesson.quiz} />

      <button onClick={handlePronunciationPractice} className="bg-blue-500 text-white px-4 py-2 rounded">
        {isRecording ? 'Stop Recording' : 'Practice Pronunciation'}
      </button>

      {feedback && <p className="mt-4">Feedback: {feedback}</p>}
    </div>
  );
};

export default LessonViewer;