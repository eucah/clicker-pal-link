import { ArrowLeft, Crown, Eye, Bluetooth } from "lucide-react";
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
          <h2 className="text-base font-bold">🎯 Présentation</h2>
          <p className="text-muted-foreground">
            <strong>Essais Continuité</strong> est une application de test de continuité électrique entre deux appareils Android connectés en Bluetooth.
          </p>
        </section>

        <section className="space-y-2">
          <Crown className="w-4 h-4 text-purple-700 dark:text-purple-300" /> Rôle Contrôleur
          <p className="text-muted-foreground">
            Le <strong>Contrôleur</strong> crée et gère le projet. Il peut :
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong>Nouveau projet</strong> — Créer un projet avec les informations de câblage (fils, bornes, borniers).</li>
            <li><strong>Ouvrir un projet</strong> — Charger un projet existant depuis un fichier JSON.</li>
            <li><strong>Partager le projet</strong> — Diffuser l'état du projet en temps réel via Bluetooth Classic.</li>
            <li><strong>Changer l'état des boutons</strong> — Appui court pour cycler entre les états.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <Eye className="w-4 h-4 text-green-700 dark:text-green-300" /> <strong>Rôle Observateur</strong>
          <p className="text-muted-foreground">
            L'<strong>Observateur</strong> se connecte au Contrôleur pour visualiser l'état du projet en temps réel. Il ne peut pas modifier les états.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">📶 Connexion Bluetooth</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Les deux appareils doivent être <strong>appairés</strong> au préalable dans les paramètres Android.</li>
            <li>Le Contrôleur démarre le partage depuis la grille (bouton "Partager projet").</li>
            <li>L'Observateur scanne et se connecte depuis l'écran de connexion.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">🔘 États des boutons</h2>
          <div className="space-y-1.5 text-muted-foreground">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-state-idle inline-block" />
              <strong>Attente</strong> — Pas encore testé
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-state-warning inline-block" />
              <strong>En cours</strong> — Test en cours
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
          <h2 className="text-base font-bold">💡 Astuces</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Appui court sur un bouton = changer son état.</li>
            <li>Appui long sur un bouton = voir ses détails (fils, borne, bornier).</li>
            <li>Le projet peut être sauvegardé en fichier JSON pour être rechargé ultérieurement.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default HelpPage;
