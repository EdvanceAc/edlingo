-- Add sample vocabulary data for admin dashboard
-- Migration to populate user_vocabulary table with sample data

-- First, let's ensure we have some user profiles to associate vocabulary with
-- Insert sample vocabulary words for existing users
INSERT INTO public.user_vocabulary (user_id, word, translation, language, definition, example_sentence, difficulty_level, mastery_level, times_reviewed)
SELECT 
    up.id as user_id,
    vocab.word,
    vocab.translation,
    vocab.language,
    vocab.definition,
    vocab.example_sentence,
    vocab.difficulty_level,
    FLOOR(RANDOM() * 6)::INTEGER as mastery_level, -- Random mastery 0-5
    FLOOR(RANDOM() * 10)::INTEGER as times_reviewed -- Random review count 0-9
FROM public.user_profiles up
CROSS JOIN (
    VALUES 
        ('hola', 'hello', 'Spanish', 'A greeting used when meeting someone', 'Hola, ¿cómo estás?', 'beginner'),
        ('gracias', 'thank you', 'Spanish', 'Expression of gratitude', 'Gracias por tu ayuda', 'beginner'),
        ('por favor', 'please', 'Spanish', 'Polite way to make a request', 'Por favor, ayúdame', 'beginner'),
        ('adiós', 'goodbye', 'Spanish', 'Farewell greeting', 'Adiós, hasta mañana', 'beginner'),
        ('sí', 'yes', 'Spanish', 'Affirmative response', 'Sí, estoy de acuerdo', 'beginner'),
        ('no', 'no', 'Spanish', 'Negative response', 'No, no me gusta', 'beginner'),
        ('agua', 'water', 'Spanish', 'Clear liquid essential for life', 'Necesito un vaso de agua', 'beginner'),
        ('comida', 'food', 'Spanish', 'Substances consumed for nutrition', 'La comida está deliciosa', 'beginner'),
        ('casa', 'house', 'Spanish', 'A building for human habitation', 'Mi casa es muy grande', 'beginner'),
        ('familia', 'family', 'Spanish', 'Group of related people', 'Mi familia es muy importante', 'beginner'),
        ('trabajo', 'work', 'Spanish', 'Activity involving effort', 'Voy al trabajo todos los días', 'intermediate'),
        ('escuela', 'school', 'Spanish', 'Institution for education', 'Los niños van a la escuela', 'intermediate'),
        ('tiempo', 'time/weather', 'Spanish', 'Duration or atmospheric conditions', 'No tengo tiempo hoy', 'intermediate'),
        ('dinero', 'money', 'Spanish', 'Medium of exchange', 'Necesito más dinero', 'intermediate'),
        ('amigo', 'friend', 'Spanish', 'Person you like and know well', 'Mi amigo es muy divertido', 'intermediate'),
        ('libro', 'book', 'Spanish', 'Written or printed work', 'Estoy leyendo un libro interesante', 'intermediate'),
        ('música', 'music', 'Spanish', 'Art form using sound and rhythm', 'Me gusta escuchar música', 'intermediate'),
        ('película', 'movie', 'Spanish', 'Motion picture', 'Vamos a ver una película', 'intermediate'),
        ('restaurante', 'restaurant', 'Spanish', 'Place where meals are served', 'Cenamos en un restaurante elegante', 'intermediate'),
        ('hospital', 'hospital', 'Spanish', 'Medical care facility', 'Mi hermana trabaja en el hospital', 'intermediate'),
        ('universidad', 'university', 'Spanish', 'Higher education institution', 'Estudio en la universidad', 'advanced'),
        ('gobierno', 'government', 'Spanish', 'System of ruling a country', 'El gobierno anunció nuevas políticas', 'advanced'),
        ('economía', 'economy', 'Spanish', 'System of trade and industry', 'La economía está creciendo', 'advanced'),
        ('tecnología', 'technology', 'Spanish', 'Application of scientific knowledge', 'La tecnología avanza rápidamente', 'advanced'),
        ('medio ambiente', 'environment', 'Spanish', 'Natural world around us', 'Debemos proteger el medio ambiente', 'advanced'),
        ('democracia', 'democracy', 'Spanish', 'System of government by the people', 'La democracia es importante', 'advanced'),
        ('filosofía', 'philosophy', 'Spanish', 'Study of fundamental questions', 'Estudio filosofía en la universidad', 'advanced'),
        ('psicología', 'psychology', 'Spanish', 'Study of mind and behavior', 'La psicología es fascinante', 'advanced'),
        ('arquitectura', 'architecture', 'Spanish', 'Design and construction of buildings', 'La arquitectura de esta ciudad es hermosa', 'advanced'),
        ('literatura', 'literature', 'Spanish', 'Written works of artistic value', 'Me encanta la literatura española', 'advanced')
) AS vocab(word, translation, language, definition, example_sentence, difficulty_level)
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_vocabulary uv 
    WHERE uv.user_id = up.id 
    AND uv.word = vocab.word 
    AND uv.language = vocab.language
)
LIMIT 100; -- Limit to prevent too much data

-- Add some French vocabulary as well
INSERT INTO public.user_vocabulary (user_id, word, translation, language, definition, example_sentence, difficulty_level, mastery_level, times_reviewed)
SELECT 
    up.id as user_id,
    vocab.word,
    vocab.translation,
    vocab.language,
    vocab.definition,
    vocab.example_sentence,
    vocab.difficulty_level,
    FLOOR(RANDOM() * 6)::INTEGER as mastery_level,
    FLOOR(RANDOM() * 10)::INTEGER as times_reviewed
FROM public.user_profiles up
CROSS JOIN (
    VALUES 
        ('bonjour', 'hello', 'French', 'A greeting used when meeting someone', 'Bonjour, comment allez-vous?', 'beginner'),
        ('merci', 'thank you', 'French', 'Expression of gratitude', 'Merci beaucoup', 'beginner'),
        ('s''il vous plaît', 'please', 'French', 'Polite way to make a request', 'S''il vous plaît, aidez-moi', 'beginner'),
        ('au revoir', 'goodbye', 'French', 'Farewell greeting', 'Au revoir, à bientôt', 'beginner'),
        ('oui', 'yes', 'French', 'Affirmative response', 'Oui, je suis d''accord', 'beginner'),
        ('non', 'no', 'French', 'Negative response', 'Non, je n''aime pas', 'beginner'),
        ('eau', 'water', 'French', 'Clear liquid essential for life', 'J''ai besoin d''un verre d''eau', 'beginner'),
        ('nourriture', 'food', 'French', 'Substances consumed for nutrition', 'La nourriture est délicieuse', 'beginner'),
        ('maison', 'house', 'French', 'A building for human habitation', 'Ma maison est très grande', 'beginner'),
        ('famille', 'family', 'French', 'Group of related people', 'Ma famille est très importante', 'beginner')
) AS vocab(word, translation, language, definition, example_sentence, difficulty_level)
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_vocabulary uv 
    WHERE uv.user_id = up.id 
    AND uv.word = vocab.word 
    AND uv.language = vocab.language
)
LIMIT 50;

-- Update the last_reviewed_at for some vocabulary to simulate usage
UPDATE public.user_vocabulary 
SET last_reviewed_at = NOW() - (RANDOM() * INTERVAL '30 days')
WHERE RANDOM() < 0.6; -- Update 60% of vocabulary with random review dates

-- Add comments for documentation
COMMENT ON TABLE public.user_vocabulary IS 'User vocabulary with sample data for admin dashboard testing';
COMMENT ON COLUMN public.user_vocabulary.mastery_level IS 'User mastery level from 0 (new) to 5 (mastered)';
COMMENT ON COLUMN public.user_vocabulary.times_reviewed IS 'Number of times user has reviewed this vocabulary';
COMMENT ON COLUMN public.user_vocabulary.last_reviewed_at IS 'Timestamp of last review session';