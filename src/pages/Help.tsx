import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Help = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-background flex flex-col px-4 py-4 safe-area-all">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md bg-secondary text-secondary-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-sm font-bold text-foreground">Aide</h1>

        <div className="w-8" />
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Cette page regroupe l’aide de l’application.
      </div>
    </div>
  );
};

export default Help;
