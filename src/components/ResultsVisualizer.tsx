import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Results {
  totalVotes: number;
  captainVotes: Record<string, number>;
  viceCaptainVotes: Record<string, number>;
  categoryVotes?: Record<string, { captainVotes: Record<string, number>; viceCaptainVotes: Record<string, number> }>;
}

const COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E5E5E5'];

export function ResultsVisualizer({ results }: { results: Results }) {
  const captainData = Object.entries(results.captainVotes).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  const viceCaptainData = Object.entries(results.viceCaptainVotes).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

  return (
    <div className="mt-4 pt-4 border-t border-black border-opacity-20 text-[10px]">
      <p className="font-bold mb-4 uppercase text-lg text-center tracking-widest">Winners & Results</p>
      
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <h4 className="font-bold uppercase tracking-wide text-center border-b border-black mb-4 pb-2">Captain Overall</h4>
          <div className="h-64 px-4 bg-white border border-black p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={captainData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                  {captainData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '10px', textTransform: 'uppercase', borderRadius: 0, border: '1px solid black' }} />
                <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h4 className="font-bold uppercase tracking-wide text-center border-b border-black mb-4 pb-2">Vice-Captain Overall</h4>
          <div className="h-64 px-4 bg-white border border-black p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={viceCaptainData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                  {viceCaptainData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '10px', textTransform: 'uppercase', borderRadius: 0, border: '1px solid black' }} />
                <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {results.categoryVotes && Object.keys(results.categoryVotes).length > 0 && (
        <div className="mt-8 border-t border-black pt-4">
          <h4 className="font-bold uppercase tracking-wide text-center mb-6">Vote Breakdown by Category</h4>
          <div className="grid gap-6">
            {Object.entries(results.categoryVotes).map(([category, catVotes]) => {
                const catCaptainData = Object.entries(catVotes.captainVotes)
                  .map(([name, value]) => ({ name, value }))
                  .filter(d => d.value > 0);
                const catViceData = Object.entries(catVotes.viceCaptainVotes)
                  .map(([name, value]) => ({ name, value }))
                  .filter(d => d.value > 0);

                if (catCaptainData.length === 0 && catViceData.length === 0) return null;

                return (
                  <div key={category} className="border border-black p-4 bg-white">
                    <h5 className="font-bold uppercase bg-black text-white p-2 mb-4 text-center">{category}</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="underline mb-2 uppercase text-center">Captain Pick</p>
                        <div className="flex flex-col gap-1">
                          {catCaptainData.map(d => (
                            <div key={d.name} className="flex justify-between border-b border-black md:border-dashed pb-1">
                              <span>{d.name}</span>
                              <span className="font-mono">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="underline mb-2 uppercase text-center">Vice-Captain Pick</p>
                        <div className="flex flex-col gap-1">
                          {catViceData.map(d => (
                            <div key={d.name} className="flex justify-between border-b border-black md:border-dashed pb-1">
                              <span>{d.name}</span>
                              <span className="font-mono">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
