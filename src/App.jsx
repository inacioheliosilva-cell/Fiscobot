import { useState, useRef, useEffect } from "react";

const COLORS = {
  bg: "#0a0e1a",
  surface: "#111827",
  card: "#1a2235",
  border: "#1e3a5f",
  accent: "#00d4ff",
  accentDim: "#0099bb",
  green: "#00e676",
  yellow: "#ffd740",
  red: "#ff5252",
  text: "#e8f4fd",
  muted: "#6b8cad",
};

// ─── DADOS BASE ─────────────────────────────────────────────────────────────

const CFOP_DATA = {
  "1102": { desc: "Compra p/ comercialização – dentro do Estado", tipo: "Entrada" },
  "1202": { desc: "Devolução de venda – dentro do Estado", tipo: "Entrada" },
  "2102": { desc: "Compra p/ comercialização – fora do Estado", tipo: "Entrada" },
  "3102": { desc: "Compra p/ comercialização – exterior", tipo: "Entrada" },
  "5102": { desc: "Venda de mercadoria – dentro do Estado", tipo: "Saída" },
  "5202": { desc: "Devolução de compra – dentro do Estado", tipo: "Saída" },
  "5405": { desc: "Venda com ST – dentro do Estado", tipo: "Saída" },
  "5910": { desc: "Remessa em bonificação – dentro do Estado", tipo: "Saída" },
  "6102": { desc: "Venda de mercadoria – fora do Estado", tipo: "Saída" },
  "6108": { desc: "Venda p/ utilização no processo produtivo", tipo: "Saída" },
  "6404": { desc: "Venda de merc. submetida a ST", tipo: "Saída" },
  "7102": { desc: "Venda de mercadoria – exportação", tipo: "Saída" },
};

const CST_ICMS = {
  "00": "Tributada integralmente",
  "10": "Tributada e com cobrança de ICMS por ST",
  "20": "Com redução de BC",
  "30": "Isenta ou não tributada com cobrança de ICMS por ST",
  "40": "Isenta",
  "41": "Não tributada",
  "50": "Suspensão",
  "51": "Diferimento",
  "60": "ICMS cobrado anteriormente por ST",
  "70": "Com redução de BC e cobrança de ICMS por ST",
  "90": "Outras",
};

const CST_PIS = {
  "01": "Operação tributável à alíquota básica",
  "02": "Operação tributável à alíquota diferenciada",
  "04": "Operação tributável por ST",
  "05": "Operação tributável por ST – alíquota diferenciada",
  "06": "Operação tributável por ST – alíquota zero",
  "07": "Operação isenta da contribuição",
  "08": "Operação sem incidência",
  "09": "Operação com suspensão",
  "49": "Outras operações de saída",
  "50": "Operação com direito a crédito – alíquota básica",
  "70": "Operação de aquisição sem crédito",
  "98": "Outras operações de entrada",
  "99": "Outras operações",
};

const REGIMES = ["Simples Nacional", "Lucro Presumido", "Lucro Real"];

// ─── CÁLCULO DE IMPOSTOS ────────────────────────────────────────────────────

function calcularImpostos(regime, valor, atividade) {
  const v = parseFloat(valor) || 0;
  const result = { regime, valor: v, tributos: {}, total: 0 };

  if (regime === "Simples Nacional") {
    const aliq = atividade === "Comércio" ? 0.04 : atividade === "Indústria" ? 0.045 : 0.06;
    result.tributos["DAS (unificado)"] = { aliq: aliq * 100, valor: v * aliq };
    result.total = v * aliq;
  } else if (regime === "Lucro Presumido") {
    const csll = v * 0.0288;
    const irpj = v * 0.048;
    const pis = v * 0.0065;
    const cofins = v * 0.03;
    const iss = atividade === "Serviço" ? v * 0.05 : 0;
    const icms = atividade !== "Serviço" ? v * 0.12 : 0;
    result.tributos = {
      "IRPJ (4,8%)": { aliq: 4.8, valor: irpj },
      "CSLL (2,88%)": { aliq: 2.88, valor: csll },
      "PIS (0,65%)": { aliq: 0.65, valor: pis },
      "COFINS (3%)": { aliq: 3, valor: cofins },
      ...(iss ? { "ISS (5%)": { aliq: 5, valor: iss } } : {}),
      ...(icms ? { "ICMS (12%)": { aliq: 12, valor: icms } } : {}),
    };
    result.total = Object.values(result.tributos).reduce((a, b) => a + b.valor, 0);
  } else {
    const pis = v * 0.0165;
    const cofins = v * 0.076;
    const csll = v * 0.09 * 0.32;
    const irpj = v * 0.15 * 0.32;
    const icms = atividade !== "Serviço" ? v * 0.12 : 0;
    result.tributos = {
      "IRPJ (15% s/ lucro estimado)": { aliq: 4.8, valor: irpj },
      "CSLL (9% s/ lucro estimado)": { aliq: 2.88, valor: csll },
      "PIS (1,65%)": { aliq: 1.65, valor: pis },
      "COFINS (7,6%)": { aliq: 7.6, valor: cofins },
      ...(icms ? { "ICMS (12%)": { aliq: 12, valor: icms } } : {}),
    };
    result.total = Object.values(result.tributos).reduce((a, b) => a + b.valor, 0);
  }
  return result;
}

// ─── COMPONENTES UI ─────────────────────────────────────────────────────────

function Badge({ color, children }) {
  const colors = {
    green: { bg: "#003322", text: COLORS.green, border: "#005533" },
    red: { bg: "#330011", text: COLORS.red, border: "#550022" },
    yellow: { bg: "#332200", text: COLORS.yellow, border: "#554400" },
    blue: { bg: "#001a33", text: COLORS.accent, border: "#003366" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      letterSpacing: 1, textTransform: "uppercase"
    }}>{children}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: 20, ...style
    }}>{children}</div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", style }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "#0d1521", border: `1px solid ${COLORS.border}`,
          borderRadius: 8, color: COLORS.text, padding: "10px 14px", fontSize: 14,
          outline: "none", boxSizing: "border-box", ...style
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", background: "#0d1521", border: `1px solid ${COLORS.border}`,
        borderRadius: 8, color: COLORS.text, padding: "10px 14px", fontSize: 14,
        outline: "none", boxSizing: "border-box"
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, color = "accent", disabled, small }) {
  const cols = {
    accent: { bg: COLORS.accent, text: "#000" },
    green: { bg: COLORS.green, text: "#000" },
    red: { bg: COLORS.red, text: "#fff" },
    ghost: { bg: "transparent", text: COLORS.accent, border: COLORS.accent },
  };
  const c = cols[color] || cols.accent;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#222" : c.bg, color: disabled ? COLORS.muted : c.text,
      border: c.border ? `1px solid ${c.border}` : "none",
      borderRadius: 8, padding: small ? "6px 14px" : "10px 20px",
      fontSize: small ? 12 : 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: 0.5, transition: "opacity .2s"
    }}>{children}</button>
  );
}

// ─── MÓDULO: CONSULTA CFOP/CST ───────────────────────────────────────────────

function ModuloCFOP() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const buscar = () => {
    const q = query.trim().toLowerCase();
    const r = [];
    Object.entries(CFOP_DATA).forEach(([cod, info]) => {
      if (cod.includes(q) || info.desc.toLowerCase().includes(q)) r.push({ cod, ...info, tipo_tributo: "CFOP" });
    });
    Object.entries(CST_ICMS).forEach(([cod, desc]) => {
      if (cod.includes(q) || desc.toLowerCase().includes(q)) r.push({ cod, desc, tipo: "ICMS", tipo_tributo: "CST-ICMS" });
    });
    Object.entries(CST_PIS).forEach(([cod, desc]) => {
      if (cod.includes(q) || desc.toLowerCase().includes(q)) r.push({ cod, desc, tipo: "PIS/COFINS", tipo_tributo: "CST-PIS" });
    });
    setResults(r);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && buscar()}
            placeholder="Buscar por código ou descrição (ex: 5102, venda, exterior...)"
            style={{ flex: 1, background: "#0d1521", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, padding: "10px 14px", fontSize: 14, outline: "none" }} />
          <Btn onClick={buscar}>Buscar</Btn>
        </div>
      </div>

      {results.length === 0 && query && (
        <div style={{ color: COLORS.muted, textAlign: "center", padding: 30 }}>Nenhum resultado encontrado.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {results.map((r, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontFamily: "monospace", fontSize: 18, color: COLORS.accent, fontWeight: 700 }}>{r.cod}</span>
                <span style={{ marginLeft: 12 }}><Badge color="blue">{r.tipo_tributo}</Badge></span>
                {r.tipo && <span style={{ marginLeft: 6 }}><Badge color={r.tipo === "Entrada" || r.tipo === "ICMS" ? "green" : "yellow"}>{r.tipo}</Badge></span>}
              </div>
            </div>
            <div style={{ marginTop: 8, color: COLORS.text, fontSize: 14 }}>{r.desc}</div>
          </Card>
        ))}
      </div>

      {results.length === 0 && !query && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {["5102 – Venda intraestadual", "6102 – Venda interestadual", "1102 – Compra intraestadual", "00 – ICMS: tributado", "40 – ICMS: isento", "50 – PIS: com crédito"].map(s => (
            <button key={s} onClick={() => { setQuery(s.split(" – ")[0]); }} style={{
              background: "#0d1521", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.muted,
              padding: "8px 12px", fontSize: 12, textAlign: "left", cursor: "pointer"
            }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MÓDULO: CALCULADORA TRIBUTÁRIA ─────────────────────────────────────────

function ModuloCalculadora() {
  const [regime, setRegime] = useState("Simples Nacional");
  const [valor, setValor] = useState("");
  const [atividade, setAtividade] = useState("Comércio");
  const [resultado, setResultado] = useState(null);

  const calcular = () => {
    if (!valor) return;
    setResultado(calcularImpostos(regime, valor, atividade));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <Card>
        <div style={{ color: COLORS.accent, fontWeight: 700, marginBottom: 16, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Parâmetros</div>
        <Select label="Regime Tributário" value={regime} onChange={setRegime} options={REGIMES} />
        <Select label="Atividade" value={atividade} onChange={setAtividade} options={["Comércio", "Indústria", "Serviço"]} />
        <Input label="Valor da Receita (R$)" value={valor} onChange={setValor} placeholder="Ex: 50000" type="number" />
        <Btn onClick={calcular} color="green">Calcular Impostos</Btn>
      </Card>

      <Card>
        <div style={{ color: COLORS.accent, fontWeight: 700, marginBottom: 16, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Resultado</div>
        {!resultado ? (
          <div style={{ color: COLORS.muted, fontSize: 14, textAlign: "center", padding: 30 }}>Preencha os dados e calcule</div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              {Object.entries(resultado.tributos).map(([nome, info]) => (
                <div key={nome} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 13, color: COLORS.text }}>{nome}</span>
                  <span style={{ fontSize: 13, color: COLORS.yellow, fontWeight: 700 }}>
                    R$ {info.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ background: "#0d1521", borderRadius: 8, padding: 14, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: COLORS.muted, fontSize: 13 }}>Receita bruta</span>
                <span style={{ color: COLORS.text }}>R$ {parseFloat(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ color: COLORS.muted, fontSize: 13 }}>Total de impostos</span>
                <span style={{ color: COLORS.red, fontWeight: 700, fontSize: 16 }}>R$ {resultado.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ color: COLORS.muted, fontSize: 13 }}>Carga efetiva</span>
                <span style={{ color: COLORS.yellow, fontWeight: 700 }}>{((resultado.total / parseFloat(valor)) * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── MÓDULO: VERIFICADOR NF-e ────────────────────────────────────────────────

function ModuloNFe() {
  const [campos, setCampos] = useState({
    cfop: "", cst: "", bcIcms: "", aliqIcms: "", vlrIcms: "",
    bcPis: "", aliqPis: "", vlrPis: "", vlrTotal: "",
  });
  const [alertas, setAlertas] = useState(null);

  const set = (k, v) => setCampos(p => ({ ...p, [k]: v }));

  const verificar = () => {
    const erros = [], avisos = [], ok = [];

    // CFOP válido?
    if (campos.cfop && !CFOP_DATA[campos.cfop]) {
      erros.push(`CFOP ${campos.cfop} não encontrado na base`);
    } else if (campos.cfop) {
      ok.push(`CFOP ${campos.cfop} válido`);
    }

    // CST ICMS válido?
    if (campos.cst && !CST_ICMS[campos.cst]) {
      erros.push(`CST ICMS ${campos.cst} não encontrado`);
    } else if (campos.cst) {
      ok.push(`CST ICMS ${campos.cst} válido`);
    }

    // ICMS calculado
    if (campos.bcIcms && campos.aliqIcms && campos.vlrIcms) {
      const esperado = (parseFloat(campos.bcIcms) * parseFloat(campos.aliqIcms)) / 100;
      const real = parseFloat(campos.vlrIcms);
      if (Math.abs(esperado - real) > 0.05) {
        erros.push(`ICMS divergente: esperado R$ ${esperado.toFixed(2)}, informado R$ ${real.toFixed(2)}`);
      } else {
        ok.push("Valor ICMS confere com BC × alíquota");
      }
    }

    // PIS calculado
    if (campos.bcPis && campos.aliqPis && campos.vlrPis) {
      const esperado = (parseFloat(campos.bcPis) * parseFloat(campos.aliqPis)) / 100;
      const real = parseFloat(campos.vlrPis);
      if (Math.abs(esperado - real) > 0.05) {
        erros.push(`PIS divergente: esperado R$ ${esperado.toFixed(2)}, informado R$ ${real.toFixed(2)}`);
      } else {
        ok.push("Valor PIS confere");
      }
    }

    if (campos.aliqIcms && parseFloat(campos.aliqIcms) > 25) {
      avisos.push("Alíquota ICMS acima de 25% — verifique se é DIFAL ou operação especial");
    }

    setAlertas({ erros, avisos, ok });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ color: COLORS.accent, fontWeight: 700, marginBottom: 14, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Identificação</div>
          <Input label="CFOP" value={campos.cfop} onChange={v => set("cfop", v)} placeholder="Ex: 5102" />
          <Input label="CST ICMS" value={campos.cst} onChange={v => set("cst", v)} placeholder="Ex: 00" />
          <Input label="Valor Total NF-e" value={campos.vlrTotal} onChange={v => set("vlrTotal", v)} placeholder="R$" type="number" />
        </Card>
        <Card>
          <div style={{ color: COLORS.accent, fontWeight: 700, marginBottom: 14, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>ICMS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Input label="BC ICMS" value={campos.bcIcms} onChange={v => set("bcIcms", v)} placeholder="R$" type="number" />
            <Input label="Alíq %" value={campos.aliqIcms} onChange={v => set("aliqIcms", v)} placeholder="%" type="number" />
            <Input label="Vl ICMS" value={campos.vlrIcms} onChange={v => set("vlrIcms", v)} placeholder="R$" type="number" />
          </div>
          <div style={{ color: COLORS.accent, fontWeight: 700, margin: "12px 0 10px", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>PIS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Input label="BC PIS" value={campos.bcPis} onChange={v => set("bcPis", v)} placeholder="R$" type="number" />
            <Input label="Alíq %" value={campos.aliqPis} onChange={v => set("aliqPis", v)} placeholder="%" type="number" />
            <Input label="Vl PIS" value={campos.vlrPis} onChange={v => set("vlrPis", v)} placeholder="R$" type="number" />
          </div>
          <Btn onClick={verificar} color="accent">Verificar NF-e</Btn>
        </Card>
      </div>

      <Card>
        <div style={{ color: COLORS.accent, fontWeight: 700, marginBottom: 16, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Resultado da Verificação</div>
        {!alertas ? (
          <div style={{ color: COLORS.muted, textAlign: "center", padding: 30, fontSize: 14 }}>Preencha os dados e clique em Verificar</div>
        ) : (
          <div>
            {alertas.erros.map((e, i) => (
              <div key={i} style={{ background: "#1a0010", border: `1px solid ${COLORS.red}33`, borderRadius: 8, padding: 12, marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: COLORS.red, fontSize: 16 }}>✗</span>
                <span style={{ color: COLORS.red, fontSize: 13 }}>{e}</span>
              </div>
            ))}
            {alertas.avisos.map((a, i) => (
              <div key={i} style={{ background: "#1a1200", border: `1px solid ${COLORS.yellow}33`, borderRadius: 8, padding: 12, marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: COLORS.yellow, fontSize: 16 }}>⚠</span>
                <span style={{ color: COLORS.yellow, fontSize: 13 }}>{a}</span>
              </div>
            ))}
            {alertas.ok.map((o, i) => (
              <div key={i} style={{ background: "#001a0d", border: `1px solid ${COLORS.green}33`, borderRadius: 8, padding: 12, marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: COLORS.green, fontSize: 16 }}>✓</span>
                <span style={{ color: COLORS.green, fontSize: 13 }}>{o}</span>
              </div>
            ))}
            {alertas.erros.length === 0 && alertas.avisos.length === 0 && (
              <div style={{ textAlign: "center", color: COLORS.green, fontSize: 16, fontWeight: 700, marginTop: 20 }}>✓ NF-e sem inconsistências!</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── MÓDULO: CHAT IA ─────────────────────────────────────────────────────────

function ModuloChat() {
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "Olá! Sou o FiscoBot IA 🤖\n\nPosso te ajudar com dúvidas fiscais, CFOP, CST, SPED, NF-e, regimes tributários, obrigações acessórias e muito mais. Como posso ajudar?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const enviar = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMsgs(p => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...msgs, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Você é o FiscoBot, um assistente especialista em contabilidade e legislação fiscal brasileira. 
Seu foco é: NF-e, CFOP, CST, ICMS, PIS, COFINS, ISS, Simples Nacional, Lucro Presumido, Lucro Real, SPED, EFD, ECF, obrigações acessórias, e-Social, DCTF, EFD-Reinf, regras fiscais estaduais e federais.
Responda de forma clara, objetiva e prática. Use exemplos concretos quando necessário. 
Quando citar códigos (CFOP, CST, etc), sempre explique o que representam.
Resposta em português brasileiro. Seja direto e útil para profissionais de contabilidade.`,
          messages: history,
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Erro ao obter resposta.";
      setMsgs(p => [...p, { role: "assistant", content: reply }]);
    } catch {
      setMsgs(p => [...p, { role: "assistant", content: "Erro de conexão. Tente novamente." }]);
    }
    setLoading(false);
  };

  const sugestoes = ["O que é CFOP 5102?", "Diferença Lucro Presumido vs Real", "Como escriturar ICMS ST?", "Prazo EFD-ICMS/IPI 2025"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 480 }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              padding: "12px 16px", fontSize: 14, lineHeight: 1.6,
              background: m.role === "user" ? COLORS.accent : COLORS.card,
              color: m.role === "user" ? "#000" : COLORS.text,
              border: m.role === "assistant" ? `1px solid ${COLORS.border}` : "none",
              whiteSpace: "pre-wrap"
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
              <span style={{ color: COLORS.muted, fontSize: 13 }}>FiscoBot digitando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {msgs.length === 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {sugestoes.map(s => (
            <button key={s} onClick={() => setInput(s)} style={{
              background: "#0d1521", border: `1px solid ${COLORS.border}`, borderRadius: 20,
              color: COLORS.muted, padding: "6px 14px", fontSize: 12, cursor: "pointer"
            }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
          placeholder="Pergunte sobre qualquer tema fiscal..."
          style={{
            flex: 1, background: "#0d1521", border: `1px solid ${COLORS.border}`, borderRadius: 8,
            color: COLORS.text, padding: "10px 14px", fontSize: 14, outline: "none"
          }} />
        <Btn onClick={enviar} disabled={loading || !input.trim()}>Enviar</Btn>
      </div>
    </div>
  );
}

// ─── MÓDULO: SPED / OBRIGAÇÕES ───────────────────────────────────────────────

function ModuloSPED() {
  const obrigacoes = [
    { nome: "EFD-ICMS/IPI", prazo: "Até dia 15 do mês seguinte", regime: "LP / LR", desc: "Escrituração Digital do ICMS e IPI" },
    { nome: "EFD-Contribuições", prazo: "Até dia 10 do mês seguinte", regime: "LP / LR", desc: "Apuração do PIS e COFINS não-cumulativo" },
    { nome: "ECF", prazo: "Último dia útil de julho", regime: "LP / LR", desc: "Escrituração Contábil Fiscal – anual" },
    { nome: "ECD", prazo: "Último dia útil de maio", regime: "LP / LR", desc: "Escrituração Contábil Digital – anual" },
    { nome: "DCTF", prazo: "Até dia 15 do 2º mês seguinte", regime: "LP / LR", desc: "Declaração de Débitos e Créditos Tributários" },
    { nome: "EFD-Reinf", prazo: "Até dia 15 do mês seguinte", regime: "Todos", desc: "Retenções na fonte e contribuições sociais" },
    { nome: "eSocial", prazo: "Dia 7 do mês seguinte", regime: "Todos", desc: "Folha de pagamento e obrigações trabalhistas" },
    { nome: "PGDAS-D (Simples)", prazo: "Até dia 20 do mês seguinte", regime: "SN", desc: "Declaração mensal do Simples Nacional" },
    { nome: "DEFIS (Simples)", prazo: "Até 31 de março", regime: "SN", desc: "Declaração de Informações Socioeconômicas – anual" },
    { nome: "DIRF", prazo: "Último dia útil de fevereiro", regime: "Todos", desc: "Declaração do Imposto de Renda Retido na Fonte – anual" },
  ];

  const [filtro, setFiltro] = useState("Todos");

  const filtrados = filtro === "Todos" ? obrigacoes : obrigacoes.filter(o => o.regime.includes(filtro.slice(0, 2)));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Todos", "Simples Nacional", "Lucro Presumido", "Lucro Real"].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            background: filtro === f ? COLORS.accent : "#0d1521",
            color: filtro === f ? "#000" : COLORS.muted,
            border: `1px solid ${filtro === f ? COLORS.accent : COLORS.border}`,
            borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700,
            cursor: "pointer"
          }}>{f}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtrados.map((o, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ color: COLORS.accent, fontWeight: 700, fontSize: 15 }}>{o.nome}</span>
                <span style={{ marginLeft: 10 }}><Badge color={o.regime === "SN" ? "green" : o.regime === "Todos" ? "blue" : "yellow"}>{o.regime}</Badge></span>
              </div>
              <div style={{ color: COLORS.yellow, fontSize: 12, fontWeight: 600 }}>{o.prazo}</div>
            </div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>{o.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ───────────────────────────────────────────────────────────

const TABS = [
  { id: "chat", label: "💬 Chat IA", desc: "Tire dúvidas fiscais com IA" },
  { id: "cfop", label: "🔍 CFOP/CST", desc: "Consulte códigos fiscais" },
  { id: "calc", label: "🧮 Tributos", desc: "Calcule impostos por regime" },
  { id: "nfe", label: "📄 NF-e", desc: "Verifique consistência" },
  { id: "sped", label: "📅 Obrigações", desc: "Prazos e declarações" },
];

export default function FiscoBot() {
  const [tab, setTab] = useState("chat");

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, background: COLORS.surface }}>
        <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${COLORS.accent}, #0066ff)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚖</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 2 }}>FISCOBOT</div>
          <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: 1 }}>SISTEMA DE APOIO FISCAL INTELIGENTE</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Badge color="green">Simples Nacional</Badge>
          <Badge color="yellow">Lucro Presumido</Badge>
          <Badge color="blue">Lucro Real</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "14px 20px", background: "none",
            borderBottom: tab === t.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            color: tab === t.id ? COLORS.accent : COLORS.muted,
            fontWeight: tab === t.id ? 700 : 400,
            fontSize: 13, cursor: "pointer", border: "none", whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: COLORS.muted, fontSize: 12, letterSpacing: 1 }}>
            {TABS.find(t => t.id === tab)?.desc}
          </div>
        </div>

        {tab === "chat" && <ModuloChat />}
        {tab === "cfop" && <ModuloCFOP />}
        {tab === "calc" && <ModuloCalculadora />}
        {tab === "nfe" && <ModuloNFe />}
        {tab === "sped" && <ModuloSPED />}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: 20, color: COLORS.muted, fontSize: 11, borderTop: `1px solid ${COLORS.border}`, marginTop: 20 }}>
        FiscoBot v2.0 — Para uso de suporte. Consulte sempre um contador habilitado para decisões fiscais.
      </div>
    </div>
  );
}
