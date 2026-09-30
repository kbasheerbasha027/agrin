import { useState } from 'react'
import { ArrowRight, Droplets, Globe2, ShieldAlert, Sprout, ThermometerSun } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const districts = [
  { name: 'Nanded', risk: 68, farms: 248, crop: 'Cotton', signal: 'Heavy rainfall watch' },
  { name: 'Hingoli', risk: 54, farms: 192, crop: 'Soybean', signal: 'Water availability check' },
  { name: 'Latur', risk: 47, farms: 165, crop: 'Pigeon pea', signal: 'Routine crop monitoring' },
  { name: 'Parbhani', risk: 42, farms: 138, crop: 'Cotton', signal: 'Routine crop monitoring' },
]

type OfficerSummary = { farms: number; atRisk: number; diseaseHotspots: number; waterStress: number; district: string; alerts: number; priority: Array<{ id: string; title: string }> }

export default function NationalDashboard({ officerSummary }: { officerSummary: OfficerSummary }) {
  const [district, setDistrict] = useState(districts[0].name)
  const selectedDistrict = districts.find((item) => item.name === district) ?? districts[0]
  const selectedFromApi = selectedDistrict.name === officerSummary.district
  const displayedDistrict = selectedFromApi ? {
    ...selectedDistrict,
    farms: officerSummary.farms,
    signal: officerSummary.priority[0]?.title ?? selectedDistrict.signal,
  } : selectedDistrict
  const districtRows = districts.map((item) => item.name === officerSummary.district ? {
    ...item,
    farms: officerSummary.farms,
    signal: officerSummary.priority[0]?.title ?? item.signal,
  } : item)

  return <section className="national-layout">
    <div className="national-heading">
      <div>
        <span className="section-kicker">POLICY INTELLIGENCE · INDIA DEMO</span>
        <h2>National agriculture overview</h2>
        <p>Illustrative regional signals for planning workflows. Not a government registry or verified national dataset.</p>
      </div>
      <label className="national-select">Focus district
        <select value={district} onChange={(event) => setDistrict(event.target.value)} aria-label="Focus district">
          {districts.map((item) => <option key={item.name}>{item.name}</option>)}
        </select>
      </label>
    </div>

    <div className="national-metrics">
      <article className="panel national-metric"><span><Globe2 size={15} /> FARMS IN DEMO</span><b>743</b><small>Illustrative records across 4 districts</small></article>
      <article className="panel national-metric"><span><ShieldAlert size={15} /> HIGH-RISK FARMS</span><b>31</b><small>Prioritize field verification</small></article>
      <article className="panel national-metric"><span><Droplets size={15} /> WATER STRESS SIGNALS</span><b>18</b><small>Prototype planning signal</small></article>
      <article className="panel national-metric"><span><ThermometerSun size={15} /> CLIMATE WATCH</span><b>Elevated</b><small>Based on seeded local demo weather</small></article>
    </div>

    <div className="national-grid">
      <section className="panel national-chart-panel">
        <div className="panel-heading"><div><span className="section-kicker">REGIONAL RISK INDEX</span><h2>District comparison</h2></div><span className="demo-label">ILLUSTRATIVE</span></div>
        <div className="national-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={districts} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#e8ebe5" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#758078', fontSize: 10 }} />
          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#758078', fontSize: 9 }} />
          <Tooltip formatter={(value) => [`${value} / 100`, 'Demo risk index']} />
          <Bar dataKey="risk" fill="#6d9568" radius={[3, 3, 0, 0]} />
        </BarChart></ResponsiveContainer></div>
        <small className="national-footnote">Prototype indicator only. Values are not measured prevalence or forecasts.</small>
      </section>

      <section className="panel national-focus">
        <div className="panel-heading"><div><span className="section-kicker">SELECTED DISTRICT</span><h2>{displayedDistrict.name}</h2></div><span className="national-risk-score">{displayedDistrict.risk}<small>/100</small></span></div>
        <dl><div><dt>{selectedFromApi ? 'Farms · demo API' : 'Illustrative farms'}</dt><dd>{displayedDistrict.farms}</dd></div><div><dt>Primary demo crop</dt><dd>{displayedDistrict.crop}</dd></div><div><dt>{selectedFromApi ? 'Priority signal · demo API' : 'Current signal'}</dt><dd>{displayedDistrict.signal}</dd></div></dl>
        <button className="button secondary" onClick={() => setDistrict('Nanded')}>Return to sample farm <ArrowRight size={14} /></button>
      </section>
    </div>

    <section className="panel national-districts">
      <div className="panel-heading"><div><span className="section-kicker">REGIONAL OPERATIONS</span><h2>District monitoring</h2></div><span className="demo-label">DEMO AGGREGATES</span></div>
      <div className="national-table" role="table" aria-label="Illustrative district monitoring">
        <div className="national-table-row national-table-head" role="row"><span>District</span><span>Demo farms</span><span>Risk index</span><span>Signal</span></div>
        {districtRows.map((item) => <button className={`national-table-row ${district === item.name ? 'row-selected' : ''}`} key={item.name} onClick={() => setDistrict(item.name)} role="row"><b>{item.name}</b><span>{item.farms}</span><span>{item.risk} / 100</span><span><Sprout size={14} /> {item.signal}</span></button>)}
      </div>
    </section>
  </section>
}
