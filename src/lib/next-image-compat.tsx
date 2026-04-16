import type { ImgHTMLAttributes } from "react";

type NextImageCompatProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

const Image = ({ priority: _priority, ...props }: NextImageCompatProps) => {
  return <img {...props} />;
};

export default Image;
