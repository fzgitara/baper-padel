import type { LeaderboardEntry, TeamLeaderboardEntry } from './leaderboard';
import type { Tournament } from './types';

export function exportLeaderboardPNG(
  tournament: Tournament,
  leaderboard: LeaderboardEntry[] | undefined,
  teamLeaderboard?: TeamLeaderboardEntry[]
): void {
  const isTeam = Boolean(teamLeaderboard && teamLeaderboard.length > 0);
  const rows = (isTeam ? teamLeaderboard! : leaderboard) as (LeaderboardEntry | TeamLeaderboardEntry)[];
  if (rows.length === 0) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Social media standard 9:16 portrait resolution (1080x1920) for Stories/Reels/TikTok/Mobile share
  const width = 1080;
  const height = 1920;

  canvas.width = width;
  canvas.height = height;

  // Clear canvas explicitly to ensure 100% transparent background around card frame
  ctx.clearRect(0, 0, width, height);

  // Outer container padding & dimensions in 9:16 portrait frame
  const marginX = 50;
  const marginY = 80;
  const cardWidth = width - marginX * 2;
  const cardHeight = height - marginY * 2;

  // Background is 100% transparent (no fill)

  // Background and borders are 100% transparent

  // ── HEADER SECTION ──
  const contentPaddingX = 40;
  const startX = marginX + contentPaddingX;
  const contentWidth = cardWidth - contentPaddingX * 2;

  // Tournament Badge / Pill
  const pillY = marginY + 45;
  const badgeText = `⚡ ${tournament.format.toUpperCase()}`;
  ctx.font = 'bold 22px sans-serif';
  const textWidth = ctx.measureText(badgeText).width;
  const pillPaddingX = 44; // 22px padding on left & right
  const pillWidth = Math.max(140, textWidth + pillPaddingX);

  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  drawRoundedRect(ctx, startX, pillY, pillWidth, 50, 25);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, startX + pillWidth / 2, pillY + 33);

  // Trophy Graphic top right
  ctx.textAlign = 'right';
  ctx.font = '85px sans-serif';
  ctx.fillText('🏆', marginX + cardWidth - contentPaddingX, marginY + 115);

  // Tournament Title
  const titleY = marginY + 155;
  ctx.font = '900 52px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  const titleText = (tournament.name || 'BAPER PADEL TOURNAMENT').toUpperCase();
  ctx.fillText(titleText, startX, titleY);

  // Subtitle / Tournament Stats summary
  const completedMatches = tournament.matches.filter(m => m.status === 'completed').length;
  ctx.font = '600 22px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(
    `PLAYERS: ${tournament.players.length}  •  MATCHES: ${completedMatches}`,
    startX,
    titleY + 42
  );

  // ── TABLE LAYOUT COMPUTATION ──
  const tableTop = marginY + 250;
  const footerHeight = 100;
  const tableHeaderHeight = 64;
  const tableHeaderGap = 4; // Margin between table header pill and body rows
  const availableHeightForRows = cardHeight - 250 - footerHeight - tableHeaderHeight - tableHeaderGap;

  // Dynamically calculate row height to fit all players vertically in 9:16 portrait mode
  const totalRows = rows.length;
  const maxRowHeight = 85;
  const minRowHeight = 42;
  const computedRowHeight = Math.max(
    minRowHeight,
    Math.min(maxRowHeight, Math.floor(availableHeightForRows / Math.max(1, totalRows)))
  );

  // ── TABLE HEADER ──
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  drawRoundedRect(ctx, startX, tableTop, contentWidth, tableHeaderHeight, 16);
  ctx.fill();

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#64748b';

  // Columns layout with generous right padding (Rank, Name, W, L, GP, DIFF, PTS)
  const colX = {
    rank: startX + 38,
    name: startX + 100,
    wins: startX + contentWidth - 400,
    losses: startX + contentWidth - 310,
    gp: startX + contentWidth - 220,
    diff: startX + contentWidth - 135,
    pts: startX + contentWidth - 55,
  };

  ctx.textAlign = 'center';
  ctx.fillText('#', colX.rank, tableTop + 41);
  ctx.textAlign = 'left';
  ctx.fillText(isTeam ? 'TEAM' : 'PLAYER', colX.name, tableTop + 41);
  ctx.textAlign = 'center';
  ctx.fillText('W', colX.wins, tableTop + 41);
  ctx.fillText('L', colX.losses, tableTop + 41);
  ctx.fillText('GP', colX.gp, tableTop + 41);
  ctx.fillText('DIFF', colX.diff, tableTop + 41);
  ctx.fillText('PTS', colX.pts, tableTop + 41);

  // ── TABLE ROWS ──
  const isCompact = computedRowHeight < 56;
  const fontSizePlayer = isCompact ? 'bold 24px sans-serif' : 'bold 32px sans-serif';
  const fontSizeStat = isCompact ? 'bold 20px sans-serif' : 'bold 26px sans-serif';

  rows.forEach((rawEntry, idx) => {
    const entry = rawEntry as LeaderboardEntry;
    const teamEntry = 'team' in rawEntry ? (rawEntry as TeamLeaderboardEntry) : undefined;
    const rowY = tableTop + tableHeaderHeight + tableHeaderGap + (idx * computedRowHeight);
    const isTop3 = idx < 3;

    // Row Background (Alternating / Top 3 Highlight)
    if (isTop3) {
      const top3Gradients = [
        'rgba(245, 158, 11, 0.20)', // 1st Gold
        'rgba(148, 163, 184, 0.16)', // 2nd Silver
        'rgba(194, 132, 90, 0.16)',  // 3rd Bronze
      ];
      ctx.fillStyle = top3Gradients[idx];
      drawRoundedRect(ctx, startX, rowY + 3, contentWidth, computedRowHeight - 6, 12);
      ctx.fill();

      // Left indicator bar for top 3
      const barColors = ['#f59e0b', '#cbd5e1', '#d97706'];
      ctx.fillStyle = barColors[idx];
      drawRoundedRect(ctx, startX, rowY + 3, 6, computedRowHeight - 6, { tl: 6, bl: 6, tr: 0, br: 0 });
      ctx.fill();
    } else if (idx % 2 === 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      drawRoundedRect(ctx, startX, rowY + 3, contentWidth, computedRowHeight - 6, 10);
      ctx.fill();
    }

    const textCenterY = rowY + (computedRowHeight / 2) + (isCompact ? 7 : 9);

    // Rank & Medal Icon
    ctx.textAlign = 'center';
    if (idx === 0) {
      ctx.font = isCompact ? '30px sans-serif' : '40px sans-serif';
      ctx.fillText('🥇', colX.rank, textCenterY - 1);
    } else if (idx === 1) {
      ctx.font = isCompact ? '30px sans-serif' : '40px sans-serif';
      ctx.fillText('🥈', colX.rank, textCenterY - 1);
    } else if (idx === 2) {
      ctx.font = isCompact ? '30px sans-serif' : '40px sans-serif';
      ctx.fillText('🥉', colX.rank, textCenterY - 1);
    } else {
      ctx.font = isCompact ? 'bold 20px sans-serif' : 'bold 26px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${idx + 1}`, colX.rank, textCenterY);
    }

    // Player / Team Name
    ctx.textAlign = 'left';
    ctx.font = fontSizePlayer;
    ctx.fillStyle = isTop3 ? '#ffffff' : '#e2e8f0';

    const maxNameWidth = colX.wins - colX.name - 20;
    const truncate = (label: string): string => {
      if (ctx.measureText(label).width <= maxNameWidth) return label;
      let shortened = label;
      while (shortened.length > 3 && ctx.measureText(shortened + '...').width > maxNameWidth) {
        shortened = shortened.slice(0, -1);
      }
      return shortened + '...';
    };

    if (teamEntry) {
      // Team name on the main line; members as a smaller secondary line below (when there is room).
      const nameLines = teamEntry.team.playerIds.length === 2
        ? teamEntry.team.playerIds
            .map(pid => teamEntry.members.find(m => m.id === pid)?.name)
            .filter(Boolean)
        : [];

      ctx.fillText(truncate(teamEntry.team.name), colX.name, textCenterY);

      if (nameLines.length > 0 && !isCompact) {
        ctx.font = '500 16px sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
        const membersLabel = nameLines.join(' & ');
        ctx.fillText(truncate(membersLabel), colX.name, textCenterY + 22);
      }
    } else {
      ctx.fillText(truncate(entry.player.name), colX.name, textCenterY);
    }

    // Wins
    ctx.textAlign = 'center';
    ctx.font = fontSizeStat;
    ctx.fillStyle = '#10b981'; // Emerald Neon
    ctx.fillText(`${entry.wins}`, colX.wins, textCenterY);

    // Losses
    ctx.font = fontSizeStat;
    ctx.fillStyle = '#ef4444'; // Red/Danger
    ctx.fillText(`${entry.losses}`, colX.losses, textCenterY);

    // Games Played
    ctx.font = fontSizeStat;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${entry.matchesPlayed}`, colX.gp, textCenterY);

    // Diff
    const diffStr = entry.pointDiff > 0 ? `+${entry.pointDiff}` : `${entry.pointDiff}`;
    ctx.font = fontSizeStat;
    ctx.fillStyle = entry.pointDiff > 0 ? '#10b981' : entry.pointDiff < 0 ? '#ef4444' : '#94a3b8';
    ctx.fillText(diffStr, colX.diff, textCenterY);

    // Points
    ctx.font = isCompact ? 'bold 26px sans-serif' : '900 34px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${entry.totalPoints}`, colX.pts, textCenterY);
  });

  // ── FOOTER SECTION ──
  const footerY = marginY + cardHeight - 45;
  ctx.textAlign = 'left';
  ctx.font = '600 20px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('⚡ POWERED BY BAPER PADEL APP', startX, footerY);

  // ctx.textAlign = 'right';
  // const timestamp = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  // ctx.fillText(`DATE: ${timestamp}`, marginX + cardWidth - contentPaddingX, footerY);

  // Trigger Download
  const safeName = (tournament.name || 'tournament').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const fileName = `baper-padel-leaderboard-9x16-${safeName}-${Date.now()}.png`;
  const dataUrl = canvas.toDataURL('image/png');

  if (!isMobileDevice()) {
    // Desktop: synchronous download only, never touch Web Share
    downloadDataUrl(dataUrl, fileName);
    return;
  }

  canvas.toBlob(async (blob) => {
    if (!blob) {
      downloadDataUrl(dataUrl, fileName);
      return;
    }
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: tournament.name || 'Padel Leaderboard' });
        return;
      } catch {
        // fall through
      }
    }
    downloadDataUrl(dataUrl, fileName);
  }, 'image/png');
}

// Helper to draw smooth rounded rectangles on HTML Canvas
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number | { tl: number; tr: number; br: number; bl: number }
) {
  let tl: number, tr: number, br: number, bl: number;
  if (typeof radii === 'number') {
    tl = tr = br = bl = radii;
  } else {
    tl = radii.tl;
    tr = radii.tr;
    br = radii.br;
    bl = radii.bl;
  }

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function isMobileDevice(): boolean {
  // Modern Client Hints API — most reliable, Chromium browsers
  const uaData = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData;
  if (uaData && typeof uaData.mobile === 'boolean') {
    return uaData.mobile;
  }
  // Fallback for Safari/Firefox — narrower regex, excludes iPad
  // (iPadOS reports as "Macintosh" by default, which is correct — iPads
  // in desktop mode behave like desktops for this purpose)
  return /iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent);
}

function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
