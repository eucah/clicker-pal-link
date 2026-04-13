import { useEffect } from "react";
import { clearKeepAwakeReasons, setKeepAwakeReason } from "@/lib/keep-awake";

const CONTROLLER_GRID_REASON = "controller-grid";
const MASTER_VIEWER_CONNECTED_REASON = "master-share-viewer-connected";
const VIEWER_CONNECTED_REASON = "viewer-project-connected";

const SESSION_REASONS = [
  CONTROLLER_GRID_REASON,
  MASTER_VIEWER_CONNECTED_REASON,
  VIEWER_CONNECTED_REASON,
];

interface SessionKeepAwakeOptions {
  controllerOnGrid: boolean;
  masterSharingWithViewerConnected: boolean;
  viewerConnectedToProject: boolean;
}

export const useSessionKeepAwake = ({
  controllerOnGrid,
  masterSharingWithViewerConnected,
  viewerConnectedToProject,
}: SessionKeepAwakeOptions) => {
  useEffect(() => {
    void setKeepAwakeReason(CONTROLLER_GRID_REASON, controllerOnGrid);
  }, [controllerOnGrid]);

  useEffect(() => {
    void setKeepAwakeReason(MASTER_VIEWER_CONNECTED_REASON, masterSharingWithViewerConnected);
  }, [masterSharingWithViewerConnected]);

  useEffect(() => {
    void setKeepAwakeReason(VIEWER_CONNECTED_REASON, viewerConnectedToProject);
  }, [viewerConnectedToProject]);

  useEffect(() => {
    return () => {
      void clearKeepAwakeReasons(SESSION_REASONS);
    };
  }, []);
};
