-- Ajoute un premier roman complet avec son chapitre 1, pour que la page
-- d'accueil ne soit plus vide. À coller dans l'éditeur SQL de Supabase.

insert into romans (titre, slug, resume, genre, niveau_theme, statut)
values (
  'Le Dernier Refuge',
  'le-dernier-refuge',
  'Quand la tempête isole sept inconnus dans un phare abandonné, chacun devra choisir entre se protéger seul ou sauver les autres.',
  'drame / survie',
  1,
  'en_cours'
);

insert into chapitres (roman_id, numero, titre, contenu, citation_fin)
select
  id,
  1,
  'La tempête',
  'Le vent frappait la falaise comme un poing sur une porte qui refuse de céder. Amara serrait son sac contre elle, les doigts blancs, tandis que le bateau tanguait une dernière fois avant que le capitaine ne crie qu''il fallait sauter, maintenant, tout de suite, ou couler avec lui.

Elle sauta.

L''eau était si froide qu''elle lui coupa le souffle avant même le choc. Autour d''elle, des formes sombres luttaient contre les vagues — six autres passagers, inconnus une heure plus tôt, réunis maintenant par la même peur. Devant eux, à peine visible dans la pluie battante, un phare dressait sa silhouette sur la falaise.

Ils l''atteignirent un à un, trempés, tremblants, comptant et recomptant leurs compagnons d''infortune du regard. Sept. Ils étaient sept à avoir survécu au naufrage.

La porte du phare était entrouverte, rouillée sur ses gonds. À l''intérieur, l''air sentait la poussière et le sel. Une lampe à pétrole, providentiellement pleine, attendait sur une table comme si quelqu''un venait tout juste de la poser là.

— On ne peut pas rester ici, dit un homme grand, la mâchoire serrée, en essorant sa veste. Il faut redescendre chercher des vivres avant que la nuit tombe complètement.

— Redescendre où ? répondit une voix plus jeune, presque un enfant. Le bateau a coulé. Il n''y a plus rien en bas.

Amara s''assit contre le mur de pierre, épuisée, et observa le groupe. Il y avait Julien, l''homme à la mâchoire serrée, qui semblait déjà vouloir commander. Il y avait Naomi, la plus jeune, qui n''avait pas dix-huit ans. Il y avait un vieil homme silencieux qui n''avait pas prononcé un mot depuis le naufrage, et qui pressait contre sa poitrine une boîte en métal qu''il n''avait pas lâchée une seule fois, pas même pour nager.

C''est en le regardant qu''Amara se souvint. Ce vieil homme — elle l''avait vu sur le bateau, plus tôt, en grande discussion avec le capitaine. Une discussion tendue. Et juste avant que la tempête ne se lève, elle l''avait vu glisser quelque chose dans sa poche, quelque chose qui, elle en était certaine à présent, appartenait au capitaine.

Le capitaine qui n''avait pas sauté à temps.

Elle aurait pu le dire tout de suite. Le dénoncer devant les autres, dans cette pièce froide où la méfiance commençait déjà à s''installer comme une huitième présence invisible. Une accusation de plus dans une nuit qui n''en manquait pas.

Mais elle repensa à la façon dont il avait tremblé en sortant de l''eau, à la façon dont ses mains n''avaient pas cessé de trembler depuis. Ce n''était pas la peur du naufrage. C''était autre chose. Une culpabilité, peut-être, plus lourde que la boîte qu''il refusait de poser.

— Il faut faire l''inventaire de ce qu''on a, dit-elle finalement, changeant de sujet, sans quitter le vieil homme des yeux. On verra pour redescendre demain, à la lumière.

Julien la regarda avec surprise, comme s''il ne s''attendait pas à ce qu''une voix vienne contredire la sienne. Puis il hocha la tête, presque malgré lui.

La nuit s''installa. Le vent continuait de hurler contre les volets, mais à l''intérieur, un silence plus doux avait pris place — celui de sept étrangers qui commençaient, sans le dire, à devenir autre chose.

Amara s''approcha du vieil homme plus tard, quand les autres dormaient enfin, épuisés. Elle s''assit à côté de lui, sans un mot d''abord.

— Je sais ce qu''il y a dans la boîte, dit-elle doucement. Ou du moins, je crois savoir à qui elle appartenait.

Il ne répondit pas tout de suite. Puis, la voix cassée par des heures de silence :

— Je ne l''ai pas volée. Il me l''a donnée. Juste avant. Il savait qu''il n''allait pas y arriver.

Amara le regarda longtemps. Elle aurait pu ne pas le croire. Elle choisit de le croire.

— Alors garde-la, dit-elle. Et demain, tu nous diras pourquoi elle comptait tant pour lui.

Le vieil homme leva les yeux vers elle, et pour la première fois depuis le naufrage, ses mains cessèrent de trembler.',
  'Parfois, la vérité qu''on choisit de ne pas dire tout de suite est celle qui sauve quelqu''un.'
from romans where slug = 'le-dernier-refuge';
