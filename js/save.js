// Basit kayıt: toplanan altın tarayıcıda saklanır (gizli sekmede saklanamazsa sorun olmaz).
(function () {
  const AK = (window.AK = window.AK || {});
  const KEY = 'altin-kilic-save';

  AK.save = { coins: 0, swordLv: 1, maxHp: 5 };
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (Number.isFinite(data.coins)) AK.save.coins = Math.max(0, Math.min(99999, data.coins));
    AK.save.muted = !!data.muted;
    if (data.checkpoint && typeof data.checkpoint.level === 'string') AK.save.checkpoint = data.checkpoint;
    AK.save.bossKing = !!data.bossKing; // Kabuk Kral yenildi mi
    // dükkân yükseltmeleri
    if (Number.isInteger(data.swordLv)) AK.save.swordLv = Math.max(1, Math.min(3, data.swordLv));
    if (Number.isInteger(data.maxHp)) AK.save.maxHp = Math.max(5, Math.min(7, data.maxHp));
    AK.save.shrineTaken = !!data.shrineTaken;
  } catch (_) { /* depolama kapalı */ }

  AK.saveGame = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(AK.save));
    } catch (_) { /* depolama kapalı */ }
  };
})();
