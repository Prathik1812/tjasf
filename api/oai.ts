import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Helper to escape XML special characters safely
function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set headers for CORS and XML response content-type
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse parameters from query string (GET) or post body (POST)
  const params = req.method === 'POST' ? req.body : req.query;
  const verb = params.verb as string;
  const identifier = params.identifier as string;
  const metadataPrefix = params.metadataPrefix as string;
  const set = params.set as string;

  const baseURL = 'https://tjasf.com/api/oai';

  // Initialize Supabase Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tnjksptolujcxqjoitxj.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    return sendOaiError(res, verb, 'badArgument', 'Supabase configuration keys missing in Vercel environment.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Validate the OAI verb
  if (!verb) {
    return sendOaiError(res, '', 'badVerb', 'Missing verb parameter.');
  }

  const validVerbs = ['Identify', 'ListMetadataFormats', 'ListSets', 'ListIdentifiers', 'ListRecords', 'GetRecord'];
  if (!validVerbs.includes(verb)) {
    return sendOaiError(res, verb, 'badVerb', `Illegal verb: ${verb}`);
  }

  try {
    switch (verb) {
      case 'Identify':
        return res.status(200).send(renderIdentify(baseURL));

      case 'ListMetadataFormats':
        return res.status(200).send(renderListMetadataFormats(baseURL));

      case 'ListSets': {
        const { data: domains } = await supabase.from('domains').select('*');
        return res.status(200).send(renderListSets(baseURL, domains || []));
      }

      case 'ListIdentifiers': {
        if (!metadataPrefix) {
          return sendOaiError(res, verb, 'badArgument', 'Missing metadataPrefix.');
        }
        if (metadataPrefix !== 'oai_dc') {
          return sendOaiError(res, verb, 'cannotDisseminateFormat', 'Only oai_dc is supported.');
        }

        let query = supabase.from('manuscripts').select('id, updated_at, created_at, domain_id').eq('status', 'published');
        
        if (set) {
          query = query.eq('domain_id', set);
        }

        const { data: manuscripts } = await query;
        if (!manuscripts || manuscripts.length === 0) {
          return sendOaiError(res, verb, 'noRecordsMatch', 'No published manuscripts found.');
        }

        return res.status(200).send(renderListIdentifiers(baseURL, metadataPrefix, manuscripts, set));
      }

      case 'ListRecords': {
        if (!metadataPrefix) {
          return sendOaiError(res, verb, 'badArgument', 'Missing metadataPrefix.');
        }
        if (metadataPrefix !== 'oai_dc') {
          return sendOaiError(res, verb, 'cannotDisseminateFormat', 'Only oai_dc is supported.');
        }

        let query = supabase.from('manuscripts').select('*, domains(*)').eq('status', 'published');
        
        if (set) {
          query = query.eq('domain_id', set);
        }

        const { data: manuscripts } = await query;
        if (!manuscripts || manuscripts.length === 0) {
          return sendOaiError(res, verb, 'noRecordsMatch', 'No published manuscripts found.');
        }

        // Fetch authors for these manuscripts to include in creator tags
        const msIds = manuscripts.map((m) => m.id);
        const { data: authors } = await supabase.from('manuscript_authors').select('*').in('manuscript_id', msIds);

        return res.status(200).send(renderListRecords(baseURL, metadataPrefix, manuscripts, authors || [], set));
      }

      case 'GetRecord': {
        if (!identifier) {
          return sendOaiError(res, verb, 'badArgument', 'Missing identifier.');
        }
        if (!metadataPrefix) {
          return sendOaiError(res, verb, 'badArgument', 'Missing metadataPrefix.');
        }
        if (metadataPrefix !== 'oai_dc') {
          return sendOaiError(res, verb, 'cannotDisseminateFormat', 'Only oai_dc is supported.');
        }

        // Extract ID from OAI urn structure (e.g. oai:tjasf.com:<uuid>)
        const uuidMatch = identifier.match(/oai:tjasf\.com:(.+)$/);
        const manuscriptId = uuidMatch ? uuidMatch[1] : identifier;

        const { data: ms } = await supabase.from('manuscripts').select('*, domains(*)').eq('id', manuscriptId).eq('status', 'published').maybeSingle();
        if (!ms) {
          return sendOaiError(res, verb, 'idDoesNotExist', 'Active published manuscript ID does not exist.');
        }

        const { data: authors } = await supabase.from('manuscript_authors').select('*').eq('manuscript_id', ms.id);

        return res.status(200).send(renderGetRecord(baseURL, metadataPrefix, ms, authors || []));
      }

      default:
        return sendOaiError(res, verb, 'badVerb', 'Unrecognized action.');
    }
  } catch (err: any) {
    console.error('OAI-PMH Feed handler exception:', err);
    return sendOaiError(res, verb, 'badArgument', err.message || 'Internal harvesting error.');
  }
}

// Generate OAI Error Response
function sendOaiError(res: VercelResponse, verb: string, code: string, message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request>${escapeXml(verb)}</request>
  <error code="${escapeXml(code)}">${escapeXml(message)}</error>
</OAI-PMH>`;
  return res.status(200).send(xml);
}

// Render XML Templates for OAI operations
function renderIdentify(baseURL: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="Identify">${escapeXml(baseURL)}</request>
  <Identify>
    <repositoryName>The Journal of Advanced Science and Futures (TJASF)</repositoryName>
    <baseURL>${escapeXml(baseURL)}</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>editorial@tjasf.com</adminEmail>
    <earliestDatestamp>2026-08-01T00:00:00Z</earliestDatestamp>
    <deletedRecord>no</deletedRecord>
    <granularity>YYYY-MM-DDThh:mm:ssZ</granularity>
  </Identify>
</OAI-PMH>`;
}

function renderListMetadataFormats(baseURL: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="ListMetadataFormats">${escapeXml(baseURL)}</request>
  <ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>oai_dc</metadataPrefix>
      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
    </metadataFormat>
  </ListMetadataFormats>
</OAI-PMH>`;
}

function renderListSets(baseURL: string, domains: any[]) {
  const sets = domains.map(d => `    <set>
      <setSpec>${escapeXml(d.id)}</setSpec>
      <setName>${escapeXml(d.name)}</setName>
      <setDescription>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
          <dc:description>Articles published under the ${escapeXml(d.name)} domain.</dc:description>
        </oai_dc:dc>
      </setDescription>
    </set>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="ListSets">${escapeXml(baseURL)}</request>
  <ListSets>
${sets}
  </ListSets>
</OAI-PMH>`;
}

function renderListIdentifiers(baseURL: string, prefix: string, manuscripts: any[], set?: string) {
  const headers = manuscripts.map(m => `    <header>
      <identifier>oai:tjasf.com:${escapeXml(m.id)}</identifier>
      <datestamp>${new Date(m.updated_at || m.created_at).toISOString()}</datestamp>
      <setSpec>${escapeXml(m.domain_id)}</setSpec>
    </header>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="ListIdentifiers" metadataPrefix="${escapeXml(prefix)}"${set ? ` set="${escapeXml(set)}"` : ''}>${escapeXml(baseURL)}</request>
  <ListIdentifiers>
${headers}
  </ListIdentifiers>
</OAI-PMH>`;
}

function renderListRecords(baseURL: string, prefix: string, manuscripts: any[], authors: any[], set?: string) {
  const records = manuscripts.map((m) => {
    const msAuthors = authors.filter((a) => a.manuscript_id === m.id);
    const creatorXml = msAuthors.map((a) => `        <dc:creator>${escapeXml(a.name)}</dc:creator>`).join('\n');
    const keywordsList = m.keywords || [];
    const subjectsXml = keywordsList.map((k: string) => `        <dc:subject>${escapeXml(k)}</dc:subject>`).join('\n');

    return `    <record>
      <header>
        <identifier>oai:tjasf.com:${escapeXml(m.id)}</identifier>
        <datestamp>${new Date(m.updated_at || m.created_at).toISOString()}</datestamp>
        <setSpec>${escapeXml(m.domain_id)}</setSpec>
      </header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
          <dc:title>${escapeXml(m.title)}</dc:title>
${creatorXml}
          <dc:subject>${escapeXml(m.domains?.name || 'Scientific Research')}</dc:subject>
${subjectsXml}
          <dc:description>${escapeXml(m.abstract)}</dc:description>
          <dc:publisher>The Journal of Advanced Science and Futures (TJASF)</dc:publisher>
          <dc:date>${new Date(m.created_at).toISOString().split('T')[0]}</dc:date>
          <dc:type>info:eu-repo/semantics/article</dc:type>
          <dc:type>text</dc:type>
          <dc:format>application/pdf</dc:format>
          <dc:identifier>${escapeXml(m.file_url)}</dc:identifier>
          <dc:language>en</dc:language>
        </oai_dc:dc>
      </metadata>
    </record>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="ListRecords" metadataPrefix="${escapeXml(prefix)}"${set ? ` set="${escapeXml(set)}"` : ''}>${escapeXml(baseURL)}</request>
  <ListRecords>
${records}
  </ListRecords>
</OAI-PMH>`;
}

function renderGetRecord(baseURL: string, prefix: string, m: any, msAuthors: any[]) {
  const creatorXml = msAuthors.map((a) => `        <dc:creator>${escapeXml(a.name)}</dc:creator>`).join('\n');
  const keywordsList = m.keywords || [];
  const subjectsXml = keywordsList.map((k: string) => `        <dc:subject>${escapeXml(k)}</dc:subject>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="GetRecord" identifier="oai:tjasf.com:${escapeXml(m.id)}" metadataPrefix="${escapeXml(prefix)}">${escapeXml(baseURL)}</request>
  <GetRecord>
    <record>
      <header>
        <identifier>oai:tjasf.com:${escapeXml(m.id)}</identifier>
        <datestamp>${new Date(m.updated_at || m.created_at).toISOString()}</datestamp>
        <setSpec>${escapeXml(m.domain_id)}</setSpec>
      </header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
          <dc:title>${escapeXml(m.title)}</dc:title>
${creatorXml}
          <dc:subject>${escapeXml(m.domains?.name || 'Scientific Research')}</dc:subject>
${subjectsXml}
          <dc:description>${escapeXml(m.abstract)}</dc:description>
          <dc:publisher>The Journal of Advanced Science and Futures (TJASF)</dc:publisher>
          <dc:date>${new Date(m.created_at).toISOString().split('T')[0]}</dc:date>
          <dc:type>info:eu-repo/semantics/article</dc:type>
          <dc:type>text</dc:type>
          <dc:format>application/pdf</dc:format>
          <dc:identifier>${escapeXml(m.file_url)}</dc:identifier>
          <dc:language>en</dc:language>
        </oai_dc:dc>
      </metadata>
    </record>
  </GetRecord>
</OAI-PMH>`;
}
