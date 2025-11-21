import { useProgress } from '../providers/ProgressProvider';
import { simplifyText } from '../services/unifiedLevelService';

const usePersonalization = () => {
  const { cefrLevel } = useProgress();

  const simplifyContent = async (text) => {
    if (!text || (cefrLevel !== 'A1' && cefrLevel !== 'A2')) {
      return text || '';
    }
    return await simplifyText(text, cefrLevel);
  };

  const getScaffolding = (questionType) => {
    if (cefrLevel === 'A1' || cefrLevel === 'A2') {
      switch (questionType) {
        case 'dialogue':
          return 'Try saying: Hello, my name is [your name]. What is your name?';
        case 'practice':
          return 'Response template: I think [opinion] because [reason].';
        default:
          return '';
      }
    }
    return '';
  };

  return { simplifyContent, getScaffolding, cefrLevel };
};

export default usePersonalization;