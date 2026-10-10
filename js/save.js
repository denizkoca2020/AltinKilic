// Basit kayıt: toplanan altın tarayıcıda saklanır (gizli sekmede saklanamazsa sorun olmaz).
(function () {
  const AK = (window.AK = window.AK || {});
  const KEY = 'altin-kilic-save';

  AK.save = { coins: 0 };
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (Number.isFinite(data.coins)) AK.save.coins = Math.max(0, Math.min(99999, data.coins));
    AK.save.muted = !!data.muted;
  } catch (_) { /* depolama kapalı */ }

  AK.saveGame = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(AK.save));
    } catch (_) { /* depolama kapalı */ }
  };
})();
