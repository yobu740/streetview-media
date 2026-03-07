interface IconRemovidaProps {
  className?: string;
  color?: string;
}

export default function IconRemovida({ className = "h-4 w-4", color = "#ff1d25" }: IconRemovidaProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 718 811"
      className={className}
      fill={color}
      aria-label="Removida"
    >
      <rect x="36.4" y="740.3" width="668.6" height="58.7"/>
      <rect x="312.1" y="651.5" width="108.2" height="88"/>
      <path d="M88,39.2v632.4h550V39.2H88ZM577.4,620.3H155.8V90.5h421.6v529.8Z"/>
      <rect x="194" y="322.1" width="320.3" height="79.5" transform="translate(359.5 -144.4) rotate(45)"/>
      <rect x="194" y="322.1" width="320.3" height="79.5" transform="translate(859.6 333.7) rotate(131.2)"/>
    </svg>
  );
}
