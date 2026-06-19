import React from 'react';

interface Results {
  totalVotes: number;
  captainVotes: Record<string, number>;
  viceCaptainVotes: Record<string, number>;
  categoryVotes?: Record<string, { captainVotes: Record<string, number>; viceCaptainVotes: Record<string, number> }>;
}

export function ResultsVisualizer({ results }: { results: Results }) {
  const captainData = Object.entries(results.captainVotes).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  const viceCaptainData = Object.entries(results.viceCaptainVotes).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const maxCaptain = Math.max(...captainData.map(d => d.value), 1);
  const maxVice = Math.max(...viceCaptainData.map(d => d.value), 1);

  return (
    <div className="mt-4 pt-4 border-t border-black border-opacity-20 text-[10px]">
      <p className="font-bold mb-4 uppercase text-lg text-center tracking-widest">Winners & Results</p>
      
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <h4 className="font-bold uppercase tracking-wide text-center border-b border-black mb-4 pb-2">Captain Overall</h4>
          <div className="bg-white border border-black p-4 space-y-4">
            {captainData.map((d, i) => (
              <div key={d.name}>
                <div className="flex justify-between mb-1">
                  <span className="font-bold uppercase truncate pr-2" title={d.name}>{d.name}</span>
                  <span className="font-mono">{d.value}</span>
                </div>
                <div className="h-4 bg-gray-200 border border-black overflow-hidden relative">
                  <div 
                    className="h-full bg-black absolute left-0 top-0 transition-all duration-1000"
                    style={{ width: `${(d.value / maxCaptain) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {captainData.length === 0 && <p className="text-center opacity-50 uppercase py-4">No votes</p>}
          </div>
        </div>
        <div>
          <h4 className="font-bold uppercase tracking-wide text-center border-b border-black mb-4 pb-2">Vice-Captain Overall</h4>
          <div className="bg-white border border-black p-4 space-y-4">
            {viceCaptainData.map((d, i) => (
              <div key={d.name}>
                <div className="flex justify-between mb-1">
                  <span className="font-bold uppercase truncate pr-2" title={d.name}>{d.name}</span>
                  <span className="font-mono">{d.value}</span>
                </div>
                <div className="h-4 bg-gray-200 border border-black overflow-hidden relative">
                  <div 
                    className="h-full bg-black absolute left-0 top-0 transition-all duration-1000"
                    style={{ width: `${(d.value / maxVice) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {viceCaptainData.length === 0 && <p className="text-center opacity-50 uppercase py-4">No votes</p>}
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
                  .filter(d => d.value > 0).sort((a, b) => b.value - a.value);
                const catViceData = Object.entries(catVotes.viceCaptainVotes)
                  .map(([name, value]) => ({ name, value }))
                  .filter(d => d.value > 0).sort((a, b) => b.value - a.value);

                if (catCaptainData.length === 0 && catViceData.length === 0) return null;

                return (
                  <div key={category} className="border border-black p-4 bg-white shadow-sm">
                    <h5 className="font-bold uppercase bg-black text-white p-2 mb-4 text-center">{category}</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="underline mb-2 uppercase text-center font-bold">Captain Pick</p>
                        <div className="flex flex-col gap-1">
                          {catCaptainData.map(d => (
                            <div key={d.name} className="flex justify-between border-b border-black md:border-dashed pb-1">
                              <span className="truncate pr-2" title={d.name}>{d.name}</span>
                              <span className="font-mono font-bold">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="underline mb-2 uppercase text-center font-bold">Vice-Captain Pick</p>
                        <div className="flex flex-col gap-1">
                          {catViceData.map(d => (
                            <div key={d.name} className="flex justify-between border-b border-black md:border-dashed pb-1">
                              <span className="truncate pr-2" title={d.name}>{d.name}</span>
                              <span className="font-mono font-bold">{d.value}</span>
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
