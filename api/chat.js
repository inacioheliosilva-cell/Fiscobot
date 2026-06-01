export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Você é o FiscoBot, assistente especialista em contabilidade e legislação fiscal brasileira. Foco em: NF-e, CFOP, CST, ICMS, PIS, COFINS, ISS, Simples Nacional, Lucro Presumido, Lucro Real, SPED, EFD, ECF, obrigações acessórias, eSocial, DCTF, EFD-Reinf. Responda de forma clara e objetiva em português brasileiro.`,
        messages: req.body.messages,
      }),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}
