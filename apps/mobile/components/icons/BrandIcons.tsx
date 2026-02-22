/**
 * Brand icons wrapper using react-native-remix-icon.
 * Hierarchy: Lucide (UI) > Remix Icons (brands/logos) > SVG custom (last resort).
 */
import Icon from "react-native-remix-icon";

interface IconProps {
  size?: number;
  color?: string;
}

export function GoogleIcon({ size = 20, color = "#000" }: IconProps) {
  return <Icon name="google-fill" size={size} color={color} />;
}

export function AppleIcon({ size = 20, color = "#000" }: IconProps) {
  return <Icon name="apple-fill" size={size} color={color} />;
}

export function GitHubIcon({ size = 20, color = "#000" }: IconProps) {
  return <Icon name="github-fill" size={size} color={color} />;
}
