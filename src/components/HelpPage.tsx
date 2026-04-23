import { ArrowLeft, Crown, Eye, Bluetooth, CircleDot, Lightbulb, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HelpPageProps {
  onBack: () => void;
}

const HelpPage = ({ onBack }: HelpPageProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-all">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Aide</h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-4xl mx-auto px-5 py-4 space-y-5 text-sm text-foreground">
          <section className="space-y-2">
            <p className="flex items-center gap-2 text-base font-bold">
              <Presentation className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              Présentation
            </p>

            <p className="text-muted-foreground">
              <strong>Essais Continuité</strong> est une application d'aide aux essais de continuité électrique grâce à deux appareils Android connectés en Bluetooth.
            </p>
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-base font-bold">
              <Crown className="w-4 h-4 text-purple-700 dark:text-purple-300" />
              Rôle contrôleur
            </p>

            <p className="text-muted-foreground">
              Le <strong>Contrôleur</strong> crée et gère le projet. Il peut :
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Nouveau projet</strong> — Créer un projet avec les informations de câblage (fils, bornes, borniers, Cf/Cm).</li>
              <li><strong>Ouvrir un projet</strong> — Charger un projet existant depuis un fichier TXT.</li>
              <li><strong>Partager le projet</strong> — Diffuser l'état du projet en temps réel via Bluetooth.</li>
              <li><strong>Changer l'état des contacts</strong> — Appui court pour faire défiler les états.</li>
              <li><strong>Éditer un rapport</strong> — Création d'un rapport au format TXT reprenant les informations du projet par borne, avec l'état Validé/Défaut, ou vide si non testé.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-base font-bold">
              <Eye className="w-4 h-4 text-green-700 dark:text-green-300" />
              Rôle observateur
            </p>

            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>L'<strong>Observateur</strong> se connecte au Contrôleur pour visualiser l'état du projet en temps réel.</li>
              <li>Il ne peut pas modifier les états.</li>
              <li>Il a la possibilité de sélectionner un contact pour obtenir les informations (fils, bornes, borniers, Cf/Cm).</li>
              <li>Comme le Contrôleur, il a la possibilité d'éditer un rapport.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-base font-bold">
              <Bluetooth className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Connexion Bluetooth
            </p>

            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Les deux appareils doivent être <strong>appairés</strong> au préalable dans les paramètres Android.</li>
              <li>Le Contrôleur démarre le partage depuis la grille du projet (bouton « Partager projet »).</li>
              <li>L'Observateur scanne et se connecte depuis l'écran de connexion.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-base font-bold">
              <CircleDot className="w-4 h-4 text-purole-900 dark:text-purple-700" />
              États des contacts
            </p>

            <div className="space-y-1.5 text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-state-idle inline-block" />
                <strong>Attente</strong> — Pas encore testé
              </p>
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-state-warning inline-block" />
                <strong>En cours</strong> — Test en cours (clignotant)
              </p>
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-state-active inline-block" />
                <strong>Validé</strong> — Continuité confirmée
              </p>
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-state-alert inline-block" />
                <strong>Défaut</strong> — Problème détecté
              </p>
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-state-locked inline-block" />
                <strong>Non testé</strong> — Verrouillé / exclu
              </p>
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-foreground inline-block" />
                <strong>Sélectionné</strong> — Contact sélectionné
              </p>
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-blue-600 inline-block" />
                <strong>Pont</strong> — Contact avec pont
              </p>
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-purple-500 inline-block" />
                <strong>Pont associé (clignotant)</strong> — fonctionne avec Pont
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-base font-bold">
              <Lightbulb className="w-4 h-4 text-yellow-500 dark:text-yellow-300" />
              Astuces
            </p>

            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Premier appui : sélectionne le contact sans changer son état et permet de voir ses détails (fils, borne, bornier, Cf/Cm).</li>
              <li>Appui court sur un contact sélectionné = change son état.</li>
              <li>Il est possible de revenir à l'état en attente et de refaire l'essai après plusieurs appuis.</li>
              <li>Le projet peut être sauvegardé en fichier TXT pour être rechargé ultérieurement.</li>
              <li>Il est possible de modifier le fichier TXT en dehors de l'application (vierge ou déjà rempli).</li>
              <li>Le format du fichier TXT permet une édition simple sous forme de tableau. Le fichier doit conserver cette forme pour permettre une lecture correcte par l'application.</li>
              <li>Un contact a la fonction <strong>Pont</strong> uniquement si son champ <strong>bornier</strong> contient « Pont ».</li>
              <li>Le numéro inscrit dans <strong>borne</strong> d'un contact Pont désigne son <strong>contact pont associé</strong>.</li>
              <li>Le contact pont associé n'est visible que lorsque le contact Pont source est sélectionné.</li>
              <li>Si la cible est elle-même définie Pont, elle garde sa définition métier Pont, mais affiche temporairement uniquement le visuel <strong>contact pont associé</strong> pendant la sélection du premier.</li>
              <li>Exemple :
                <ul className="list-['-'] pl-5">
                  <li>contact #1   fils: xxfd  borne: aaxx  bornier: ashs</li>
                  <li>contact #10  fils: xxfd  borne: 1     bornier: Pont</li>
                  <li>contact #140 fils: xxfd  borne: 10    bornier: Pont</li>
                </ul>
                (#10 et #140 sont <span className="w-3 h-3 rounded-full border-2 border-blue-600 inline-block" /> Pont en permanence. Quand #10 est <span className="w-3 h-3 rounded-full border-2 border-foreground inline-block" /> sélectionné, #1 devient <span className="w-3 h-3 rounded-full border-2 border-purple-500 inline-block" /> contact pont associé. Quand #140 est <span className="w-3 h-3 rounded-full border-2 border-foreground inline-block" /> sélectionné, #10 prend le visuel <span className="w-3 h-3 rounded-full border-2 border-purple-500 inline-block" /> contact pont associé.)
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
