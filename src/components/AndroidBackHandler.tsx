import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";

const AndroidBackHandler = () => {
  useAndroidBackButton({ rootPath: "/", exitIntervalMs: 2000 });

  return null;
};

export default AndroidBackHandler;
