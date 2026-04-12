import { ArrowLeft, Crown, Eye, Bluetooth, CircleDot, Lightbulb, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HelpPageProps {
  onBack: () => void;
}

const HelpPage = ({ onBack }: HelpPageProps) => {
  return (
    <div className="h-screen bg-background flex flex-col safe-area-all">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Aide</h1>
      </header>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-5 text-sm text-foreground">
        <section className="space-y-2">

          <p className="flex items-center gap-2 text-base font-bold">
          <Presentation className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          Présentation
          </p>

          <p className="text-muted-foreground">
            <strong>Essais Continuité</strong> est une application d'aide aux essais de continuité électrique grâce à deux appareils "Android" connectés en Bluetooth.
          </p>
        </section>

        <section className="space-y-2">
          <p className="flex items-center gap-2 text-base font-bold">
          <Crown className="w-4 h-4 text-purple-700 dark:text-purple-300" />
          Rôle Contrôleur
          </p>

          <p className="text-muted-foreground">
            Le <strong>Contrôleur</strong> crée et gère le projet. Il peut :
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong>Nouveau projet</strong> — Créer un projet avec les informations de câblage (fils, bornes, borniers, CF/CM).</li>
            <li><strong>Ouvrir un projet</strong> — Charger un projet existant depuis un fichier TXT.</li>
            <li><strong>Partager le projet</strong> — Diffuser l'état du projet en temps réel via Bluetooth.</li>
            <li><strong>Changer l'état des boutons</strong> — Appui court pour cycler entre les états.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <p className="flex items-center gap-2 text-base font-bold">
          <Eye className="w-4 h-4 text-green-700 dark:text-green-300" />
            Rôle Observateur
          </p>

          <p className="text-muted-foreground">
            L'<strong>Observateur</strong> se connecte au Contrôleur pour visualiser l'état du projet en temps réel. Il ne peut pas modifier les états. Mais a la possibilité de sélectionner un bouton pour avoir les informations (fils, bornes, borniers, CF/CM).
          </p>
        </section>

        <section className="space-y-2">
          <p className="flex items-center gap-2 text-base font-bold">
          <Bluetooth className="w-4 h-4 text-blue-600 dark:text-blue-400" />   
            Connexion Bluetooth
          </p>

          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Les deux appareils doivent être <strong>appairés</strong> au préalable dans les paramètres Android.</li>
            <li>Le Contrôleur démarre le partage depuis la grille (bouton "Partager projet").</li>
            <li>L'Observateur scanne et se connecte depuis l'écran de connexion.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <p className="flex items-center gap-2 text-base font-bold">
          <CircleDot className="w-4 h-4 text-yellow-900 dark:text-yellow-700" />
          États des boutons
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
              <strong>Non Testé</strong> — Verrouillé / exclu
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <p className="flex items-center gap-2 text-base font-bold">
          <Lightbulb className="w-4 h-4 text-yellow-500 dark:text-yellow-300" />
          Astuces
          </p>

          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Appui court sur un bouton = changer son état et voir ses détails (fils, borne, bornier, CF/CM).</li>
            <li>Il est possible de revenir à l'état en attente et de refaire l'essai.</li>
            <li>Le projet peut être sauvegardé en fichier TXT pour être rechargé ultérieurement.</li>
            <li>Il est possible d'éditer le fichier TXT en dehors de l'application (vierge ou déjà rempli).</li>
            <li>La forme du fichier TXT permet édition simple sous forme de tableau. Le fichier doit garder cette forme pour permettre une lecture correcte pour l'application.</li>
        </ul>
        </section>
      </div>
    </div>
  );
};

export default HelpPage;
