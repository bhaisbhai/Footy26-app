import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface PlayerHeatmapProps {
  athleteName: string;
  position?: string;
  className?: string;
}

export function PlayerHeatmap({ athleteName, position = 'Attacker', className = '' }: PlayerHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 420;
    const height = 272; // Pitch ratio roughly 105x68

    // Draw pitch background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#1a3622'); // Dark green grass

    // Pitch markings
    const g = svg.append('g').attr('stroke', '#ffffff').attr('stroke-width', 2).attr('fill', 'none').attr('opacity', 0.5);

    // Outline
    g.append('rect').attr('x', 10).attr('y', 10).attr('width', width - 20).attr('height', height - 20);

    // Halfway line
    g.append('line').attr('x1', width / 2).attr('y1', 10).attr('x2', width / 2).attr('y2', height - 10);

    // Center circle
    g.append('circle').attr('cx', width / 2).attr('cy', height / 2).attr('r', 35);
    g.append('circle').attr('cx', width / 2).attr('cy', height / 2).attr('r', 2).attr('fill', '#ffffff');

    // Left penalty area
    g.append('rect').attr('x', 10).attr('y', height / 2 - 50).attr('width', 60).attr('height', 100);
    // Left goal area
    g.append('rect').attr('x', 10).attr('y', height / 2 - 20).attr('width', 20).attr('height', 40);
    // Left penalty spot
    g.append('circle').attr('cx', 45).attr('cy', height / 2).attr('r', 2).attr('fill', '#ffffff');

    // Right penalty area
    g.append('rect').attr('x', width - 70).attr('y', height / 2 - 50).attr('width', 60).attr('height', 100);
    // Right goal area
    g.append('rect').attr('x', width - 30).attr('y', height / 2 - 20).attr('width', 20).attr('height', 40);
    // Right penalty spot
    g.append('circle').attr('cx', width - 45).attr('cy', height / 2).attr('r', 2).attr('fill', '#ffffff');

    // Generate random representative points based on position
    const points: [number, number][] = [];
    const numPoints = 200;

    let xMean, yMean, xStd, yStd;

    const pos = position.toLowerCase();
    
    // Rough approximations
    const isKeeper = pos.includes('goalkeeper') || pos.includes('gk') || athleteName.toLowerCase().includes('ochoa') || athleteName.toLowerCase().includes('simon') || athleteName.toLowerCase().includes('martinez');
    const isDefender = pos.includes('defender') || pos.includes('cb') || pos.includes('back');
    const isMidfielder = pos.includes('midfielder') || pos.includes('cm') || pos.includes('cdm') || pos.includes('cam');
    const isAttacker = !isKeeper && !isDefender && !isMidfielder; // default

    if (isKeeper) {
      xMean = 40; yMean = height / 2; xStd = 15; yStd = 30;
    } else if (isDefender) {
      xMean = 120; yMean = height / 2; xStd = 40; yStd = 80;
    } else if (isMidfielder) {
      xMean = width / 2; yMean = height / 2; xStd = 80; yStd = 80;
    } else { // Attacker
      xMean = width - 100; yMean = height / 2; xStd = 50; yStd = 70;
    }
    
    // Seed with athlete name length to keep it consistent-ish for the same player.
    const pseudoRandom = () => {
        let n = 0;
        for (let i = 0; i < athleteName.length; i++) {
            n += athleteName.charCodeAt(i) * Math.sin(i);
        }
        return Math.abs(Math.sin(n));
    };

    const randomNormalX = d3.randomNormal(xMean, xStd);
    const randomNormalY = d3.randomNormal(yMean, yStd);
    const randomShotX = d3.randomNormal(width - 40, 15);
    const randomShotY = d3.randomNormal(height / 2, 25);
    const randomMidX = d3.randomNormal(width / 2, 20);
    const randomMidY = d3.randomNormal(height / 2, 20);

    for (let i = 0; i < numPoints; i++) {
        // We use Math.random() here for pure visual variance, but biased by the player's role
        let x = randomNormalX();
        let y = randomNormalY();

        // Extra hotspots for attackers (shots/goals)
        if (isAttacker && i < 30) {
            x = randomShotX();
            y = randomShotY();
        }

        // Extra hotspots for midfielders (central distribution)
        if (isMidfielder && i < 30) {
             x = randomMidX();
             y = randomMidY();
        }

        points.push([Math.max(10, Math.min(width - 10, x)), Math.max(10, Math.min(height - 10, y))]);
    }

    // Set up contour density computation
    const densityData = d3.contourDensity()
        .x(d => d[0])
        .y(d => d[1])
        .size([width, height])
        .bandwidth(20)(points);

    // Color scale for heatmap
    const colorScale = d3.scaleLinear<string>()
        .domain(d3.extent(densityData, d => d.value) as [number, number])
        .range(["rgba(255, 255, 0, 0)", "rgba(255, 0, 0, 0.8)"]);

    // Render contours
    svg.insert("g", "g") // insert before lines
        .attr("class", "contours")
        .selectAll("path")
        .data(densityData)
        .enter().append("path")
        .attr("d", d3.geoPath())
        .attr("fill", d => colorScale(d.value))
        .attr("opacity", 0.6)
        .attr("stroke", "none");

  }, [athleteName, position]);

  return (
    <div className={`flex flex-col items-center bg-[#0a101a] border border-white/10 rounded-xl p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-white/90 mb-3 uppercase tracking-wider">Movement Heatmap</h4>
      <svg ref={svgRef} className="w-full max-w-[420px] shadow-2xl rounded-sm overflow-hidden" viewBox="0 0 420 272" preserveAspectRatio="xMidYMid meet"></svg>
      <div className="mt-3 flex items-center justify-between w-full max-w-[420px] text-xs font-mono text-white/50">
        <span>Defensive Half</span>
        <div className="flex-1 flex justify-center gap-1 mx-2">
           <svg width="60" height="8">
             <defs>
                <linearGradient id="heat" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 255, 0, 0)" />
                  <stop offset="50%" stopColor="rgba(255, 128, 0, 0.5)" />
                  <stop offset="100%" stopColor="rgba(255, 0, 0, 0.8)" />
                </linearGradient>
             </defs>
             <rect width="60" height="8" fill="url(#heat)" rx="2" />
           </svg>
        </div>
        <span>Attacking Half</span>
      </div>
    </div>
  );
}
