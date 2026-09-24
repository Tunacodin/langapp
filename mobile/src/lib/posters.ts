// Video kartlari icin onizleme (poster) haritasi. Her poster, ilgili videonun
// acilis karesinden ffmpeg ile uretilmis kucuk bir JPG'dir (bkz. assets/posters/).
// Siyah placeholder yerine kartlarda bu goruntu gosterilir. Runtime maliyeti yok:
// derleme aninda gomulu, cevrimdisi calisir. Anahtar = video_id (youtube_id).

const POSTERS: Record<string, number> = {
  // Sarki kapaklari (clip_id ile ayni anahtar)
  gotye_used_to: require('../../assets/posters/gotye_used_to.jpg'),
  adele_someone: require('../../assets/posters/adele_someone.jpg'),
  queen_champions: require('../../assets/posters/queen_champions.jpg'),
  bruno_yourman: require('../../assets/posters/bruno_yourman.jpg'),
  beyonce_ifiwere: require('../../assets/posters/beyonce_ifiwere.jpg'),
  greenday_september: require('../../assets/posters/greenday_september.jpg'),

  aliabdaal_eve: require('../../assets/posters/aliabdaal_eve.jpg'),
  damon_paris: require('../../assets/posters/damon_paris.jpg'),
  davella_routine: require('../../assets/posters/davella_routine.jpg'),
  easyeng_london: require('../../assets/posters/easyeng_london.jpg'),
  fireship_ai: require('../../assets/posters/fireship_ai.jpg'),
  foodreview_st: require('../../assets/posters/foodreview_st.jpg'),
  foster_matchday: require('../../assets/posters/foster_matchday.jpg'),
  hitc_risefall: require('../../assets/posters/hitc_risefall.jpg'),
  learneng_tv: require('../../assets/posters/learneng_tv.jpg'),
  lesson1: require('../../assets/posters/lesson1.jpg'),
  mayuko_day: require('../../assets/posters/mayuko_day.jpg'),
  mckinnon_day: require('../../assets/posters/mckinnon_day.jpg'),
  mkbhd_ai: require('../../assets/posters/mkbhd_ai.jpg'),
  ndrew_sleep: require('../../assets/posters/ndrew_sleep.jpg'),
  neistat_vlog: require('../../assets/posters/neistat_vlog.jpg'),
  skysports_micd: require('../../assets/posters/skysports_micd.jpg'),
  techlead_day: require('../../assets/posters/techlead_day.jpg'),
  ted_procrast: require('../../assets/posters/ted_procrast.jpg'),
  tifo_clubs_money: require('../../assets/posters/tifo_clubs_money.jpg'),
  yestheory_yes: require('../../assets/posters/yestheory_yes.jpg'),
  zoella_vlog: require('../../assets/posters/zoella_vlog.jpg'),
};

// Video icin poster modulu; yoksa null (kart siyah zemine duser).
export function getPoster(videoId: string | null | undefined): number | null {
  if (!videoId) return null;
  return POSTERS[videoId] ?? null;
}
