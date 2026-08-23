-- ============ UPDATE HOMEPAGE CONTENT FOR TJASF AIMS & SCOPE ============
-- Update Intro
UPDATE homepage_content
SET value = 'The Journal of Advanced Scientific Frontiers (TJASF) is a non-profit, quarterly published, open-access journal. TJASF operates an online submission and peer review system, allowing authors to submit articles online and track their progress via its web interface. TJASF accepts the DOAJ''s definition of open access. In addition, TJASF''s publication ethics and publication malpractice statement is mainly based on the Code of Conduct and Best Practice Guidelines for Journal Editors (Committee on Publication Ethics (COPE), 2011). The TJASF journal aims for a publication speed of 90 days from submission to final publication. It uses the LOCKSS archival system.'
WHERE key = 'about_intro';

-- Update Aims & Scope
UPDATE homepage_content
SET value = 'The Journal of Advanced Scientific Frontiers (TJASF) is an international, peer-reviewed journal dedicated to publishing high-quality original research articles, review papers, short communications, and case studies that advance the theory, methodologies, and practical applications of modern science, engineering, and technology. The journal serves as a multidisciplinary platform for researchers, academics, industry professionals, and practitioners to disseminate innovative findings and emerging developments across scientific frontiers.

The journal welcomes contributions spanning a broad range of topics, including physical sciences, computational sciences, environmental systems, engineering disciplines, artificial intelligence, data science, cybersecurity, robotics, materials science, mathematics, renewable energy, and smart technologies. We encourage submissions that bridge traditional boundaries and offer new perspectives on scientific challenges.

TJASF particularly encourages research that demonstrates a transformative impact across diverse application domains. These include engineering and technology, healthcare and medical diagnostics, renewable energy and smart grids, transportation and autonomous mobility, smart cities, agriculture, environmental sustainability, education, finance, manufacturing, industrial automation, and public services.

By fostering the exchange of novel ideas, advanced methodologies, and real-world implementations, TJASF aims to promote the responsible development and deployment of scientific and technological innovations that contribute to scientific advancement, technological innovation, economic growth, and societal well-being.'
WHERE key = 'about_aims';
