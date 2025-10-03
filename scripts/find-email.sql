-- Query per cercare un'email in tutte le tabelle del database
-- Sostituisci 'EMAIL_DA_CERCARE' con l'email effettiva

-- Cerca nella tabella iscritti (subscribers)
SELECT 'wp_subscribers' as tabella, id, first_name, last_name, email, created_at
FROM wp_subscribers 
WHERE email = 'EMAIL_DA_CERCARE';

-- Cerca nella tabella istruttori (instructors)
SELECT 'wp_instructors' as tabella, id, name, email, role, created_at
FROM wp_instructors 
WHERE email = 'EMAIL_DA_CERCARE';

-- Cerca in tutte le tabelle con un'unica query (se supportato)
SELECT 
    'wp_subscribers' as tabella,
    id::text as record_id,
    first_name || ' ' || last_name as nome_completo,
    email,
    created_at
FROM wp_subscribers 
WHERE email = 'EMAIL_DA_CERCARE'

UNION ALL

SELECT 
    'wp_instructors' as tabella,
    id::text as record_id,
    name as nome_completo,
    email,
    created_at
FROM wp_instructors 
WHERE email = 'EMAIL_DA_CERCARE'

ORDER BY tabella, created_at;

-- Query per cercare email simili (nel caso ci siano spazi o caratteri nascosti)
SELECT 
    'wp_subscribers' as tabella,
    id,
    first_name || ' ' || last_name as nome_completo,
    email,
    LENGTH(email) as lunghezza_email,
    created_at
FROM wp_subscribers 
WHERE email ILIKE '%EMAIL_DA_CERCARE%'

UNION ALL

SELECT 
    'wp_instructors' as tabella,
    id,
    name as nome_completo,
    email,
    LENGTH(email) as lunghezza_email,
    created_at
FROM wp_instructors 
WHERE email ILIKE '%EMAIL_DA_CERCARE%'

ORDER BY tabella, created_at;
