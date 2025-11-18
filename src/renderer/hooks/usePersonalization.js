import { useState, useEffect } from 'react';
import { useProgress } from '../providers/ProgressProvider';

import textSimplificationService from '../../services/textSimplification';
import progressionService from '../../services/progressionService';

const usePersonalization = () => {
  const { cefrLevel } = useProgress();
  const [level, setLevel] = useState(cefrLevel);

  useEffect(() => {
    setLevel(cefrLevel);
  }, [cefrLevel]);

  const simplifyContent = async (content) => {
    return await textSimplificationService.simplifyText(content, level);
  };

  const getScaffolding = async (question) => {
    return await progressionService.generateScaffolding(question, level);
  };

  return { simplifyContent, getScaffolding };
};

export default usePersonalization;