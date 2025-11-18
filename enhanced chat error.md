Uncaught TypeError: Cannot read properties of undefined (reading 'join')
    at EnhancedChat.jsx:392:113
    at Array.map (<anonymous>)
    at EnhancedChat.jsx:390:57
    at Array.map (<anonymous>)
    at EnhancedChat (EnhancedChat.jsx:318:21)
    at renderWithHooks (chunk-HRZTCQ74.js?v=16963bef:11594:26)
    at updateFunctionComponent (chunk-HRZTCQ74.js?v=16963bef:14628:28)
    at beginWork (chunk-HRZTCQ74.js?v=16963bef:15970:22)
    at HTMLUnknownElement.callCallback2 (chunk-HRZTCQ74.js?v=16963bef:3678:22)
    at Object.invokeGuardedCallbackDev (chunk-HRZTCQ74.js?v=16963bef:3703:24)
(anonymous) @ EnhancedChat.jsx:392
(anonymous) @ EnhancedChat.jsx:390
EnhancedChat @ EnhancedChat.jsx:318
renderWithHooks @ chunk-HRZTCQ74.js?v=16963bef:11594
updateFunctionComponent @ chunk-HRZTCQ74.js?v=16963bef:14628
beginWork @ chunk-HRZTCQ74.js?v=16963bef:15970
callCallback2 @ chunk-HRZTCQ74.js?v=16963bef:3678
invokeGuardedCallbackDev @ chunk-HRZTCQ74.js?v=16963bef:3703
invokeGuardedCallback @ chunk-HRZTCQ74.js?v=16963bef:3737
beginWork$1 @ chunk-HRZTCQ74.js?v=16963bef:19816
performUnitOfWork @ chunk-HRZTCQ74.js?v=16963bef:19249
workLoopSync @ chunk-HRZTCQ74.js?v=16963bef:19188
renderRootSync @ chunk-HRZTCQ74.js?v=16963bef:19167
performSyncWorkOnRoot @ chunk-HRZTCQ74.js?v=16963bef:18925
flushSyncCallbacks @ chunk-HRZTCQ74.js?v=16963bef:9164
(anonymous) @ chunk-HRZTCQ74.js?v=16963bef:18675
Show 13 more frames
Show less
EnhancedChat.jsx:392 Uncaught TypeError: Cannot read properties of undefined (reading 'join')
    at EnhancedChat.jsx:392:113
    at Array.map (<anonymous>)
    at EnhancedChat.jsx:390:57
    at Array.map (<anonymous>)
    at EnhancedChat (EnhancedChat.jsx:318:21)
    at renderWithHooks (chunk-HRZTCQ74.js?v=16963bef:11594:26)
    at updateFunctionComponent (chunk-HRZTCQ74.js?v=16963bef:14628:28)
    at beginWork (chunk-HRZTCQ74.js?v=16963bef:15970:22)
    at HTMLUnknownElement.callCallback2 (chunk-HRZTCQ74.js?v=16963bef:3678:22)
    at Object.invokeGuardedCallbackDev (chunk-HRZTCQ74.js?v=16963bef:3703:24)
(anonymous) @ EnhancedChat.jsx:392
(anonymous) @ EnhancedChat.jsx:390
EnhancedChat @ EnhancedChat.jsx:318
renderWithHooks @ chunk-HRZTCQ74.js?v=16963bef:11594
updateFunctionComponent @ chunk-HRZTCQ74.js?v=16963bef:14628
beginWork @ chunk-HRZTCQ74.js?v=16963bef:15970
callCallback2 @ chunk-HRZTCQ74.js?v=16963bef:3678
invokeGuardedCallbackDev @ chunk-HRZTCQ74.js?v=16963bef:3703
invokeGuardedCallback @ chunk-HRZTCQ74.js?v=16963bef:3737
beginWork$1 @ chunk-HRZTCQ74.js?v=16963bef:19816
performUnitOfWork @ chunk-HRZTCQ74.js?v=16963bef:19249
workLoopSync @ chunk-HRZTCQ74.js?v=16963bef:19188
renderRootSync @ chunk-HRZTCQ74.js?v=16963bef:19167
recoverFromConcurrentError @ chunk-HRZTCQ74.js?v=16963bef:18784
performSyncWorkOnRoot @ chunk-HRZTCQ74.js?v=16963bef:18930
flushSyncCallbacks @ chunk-HRZTCQ74.js?v=16963bef:9164
(anonymous) @ chunk-HRZTCQ74.js?v=16963bef:18675
Show 14 more frames
Show less
chunk-HRZTCQ74.js?v=16963bef:14078 The above error occurred in the <EnhancedChat> component:

    at EnhancedChat (http://localhost:3000/src/renderer/pages/EnhancedChat.jsx:26:35)
    at div
    at MotionComponent (http://localhost:3000/node_modules/.vite/deps/framer-motion.js?v=16963bef:275:40)
    at RenderedRoute (http://localhost:3000/node_modules/.vite/deps/react-router-dom.js?v=16963bef:4086:5)
    at Routes (http://localhost:3000/node_modules/.vite/deps/react-router-dom.js?v=16963bef:4556:5)
    at PresenceChild (http://localhost:3000/node_modules/.vite/deps/framer-motion.js?v=16963bef:7100:24)
    at AnimatePresence (http://localhost:3000/node_modules/.vite/deps/framer-motion.js?v=16963bef:7166:26)
    at main
    at div
    at div
    at AppLayout (http://localhost:3000/src/renderer/App.jsx:36:22)
    at Router (http://localhost:3000/node_modules/.vite/deps/react-router-dom.js?v=16963bef:4499:15)
    at BrowserRouter (http://localhost:3000/node_modules/.vite/deps/react-router-dom.js?v=16963bef:5245:5)
    at AIProvider (http://localhost:3000/src/renderer/providers/AIProvider.jsx:30:30)
    at ProgressProvider (http://localhost:3000/src/renderer/providers/ProgressProvider.jsx:88:36)
    at AudioProvider (http://localhost:3000/src/renderer/providers/AudioProvider.jsx:45:33)
    at ThemeProvider (http://localhost:3000/src/renderer/providers/ThemeProvider.jsx:33:33)
    at App (http://localhost:3000/src/renderer/App.jsx:111:37)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
logCapturedError @ chunk-HRZTCQ74.js?v=16963bef:14078
update.callback @ chunk-HRZTCQ74.js?v=16963bef:14098
callCallback @ chunk-HRZTCQ74.js?v=16963bef:11294
commitUpdateQueue @ chunk-HRZTCQ74.js?v=16963bef:11311
commitLayoutEffectOnFiber @ chunk-HRZTCQ74.js?v=16963bef:17139
commitLayoutMountEffects_complete @ chunk-HRZTCQ74.js?v=16963bef:18028
commitLayoutEffects_begin @ chunk-HRZTCQ74.js?v=16963bef:18017
commitLayoutEffects @ chunk-HRZTCQ74.js?v=16963bef:17968
commitRootImpl @ chunk-HRZTCQ74.js?v=16963bef:19404
commitRoot @ chunk-HRZTCQ74.js?v=16963bef:19328
performSyncWorkOnRoot @ chunk-HRZTCQ74.js?v=16963bef:18946
flushSyncCallbacks @ chunk-HRZTCQ74.js?v=16963bef:9164
(anonymous) @ chunk-HRZTCQ74.js?v=16963bef:18675
Show 13 more frames
Show less
chunk-HRZTCQ74.js?v=16963bef:9174 Uncaught TypeError: Cannot read properties of undefined (reading 'join')
    at EnhancedChat.jsx:392:113
    at Array.map (<anonymous>)
    at EnhancedChat.jsx:390:57
    at Array.map (<anonymous>)
    at EnhancedChat (EnhancedChat.jsx:318:21)
    at renderWithHooks (chunk-HRZTCQ74.js?v=16963bef:11594:26)
    at updateFunctionComponent (chunk-HRZTCQ74.js?v=16963bef:14628:28)
    at beginWork (chunk-HRZTCQ74.js?v=16963bef:15970:22)
    at beginWork$1 (chunk-HRZTCQ74.js?v=16963bef:19804:22)
    at performUnitOfWork (chunk-HRZTCQ74.js?v=16963bef:19249:20)
(anonymous) @ EnhancedChat.jsx:392
(anonymous) @ EnhancedChat.jsx:390
EnhancedChat @ EnhancedChat.jsx:318
renderWithHooks @ chunk-HRZTCQ74.js?v=16963bef:11594
updateFunctionComponent @ chunk-HRZTCQ74.js?v=16963bef:14628
beginWork @ chunk-HRZTCQ74.js?v=16963bef:15970
beginWork$1 @ chunk-HRZTCQ74.js?v=16963bef:19804
performUnitOfWork @ chunk-HRZTCQ74.js?v=16963bef:19249
workLoopSync @ chunk-HRZTCQ74.js?v=16963bef:19188
renderRootSync @ chunk-HRZTCQ74.js?v=16963bef:19167
recoverFromConcurrentError @ chunk-HRZTCQ74.js?v=16963bef:18784
performSyncWorkOnRoot @ chunk-HRZTCQ74.js?v=16963bef:18930
flushSyncCallbacks @ chunk-HRZTCQ74.js?v=16963bef:9164
(anonymous) @ chunk-HRZTCQ74.js?v=16963bef:18675
Show 11 more frames
Show less
EnhancedChat.jsx:200 Failed to get AI response: TypeError: Cannot read properties of undefined (reading 'length')
    at handleSendMessage (EnhancedChat.jsx:194:32)