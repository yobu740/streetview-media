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
      <rect x="594.9" y="197.1" width="29.9" height="592.9"/>
      <path d="M646.1,231.7c-4.8-123.6-106.4-191.2-231.2-191.2s-226.4,68.1-231.2,191.6l-17.3,33.2h-5.5c4.8-136.5,116.7-245,254-245s249.2,108.6,254,245h-6.7l-16.2-33.7Z"/>
      <rect x="185.4" y="175.8" width="460.7" height="21.3"/>
      <rect x="405.8" y="54.5" width="11.4" height="403.5" transform="translate(38.4 565.7) rotate(-71.6)"/>
      <rect x="172.6" y="768.7" width="439.3" height="21.3"/>
      <rect x="513.9" y="713.2" width="34.1" height="68.2"/>
      <rect x="484" y="683.4" width="93.8" height="29.9"/>
      <rect x="535.8" y="635.7" width="82.1" height="13.7" transform="translate(-173.2 1070.4) rotate(-77.8)"/>
      <rect x="213.8" y="715.3" width="71.1" height="57.8"/>
      <path d="M103,313v415.6h273.4v-415.6H103ZM346.3,694.8h-209.6v-348.1h209.6v348.1Z"/>
      <rect x="136.2" y="498.9" width="210.4" height="52.2" transform="translate(441.9 -16.9) rotate(45)"/>
      <rect x="136.2" y="498.9" width="210.4" height="52.2" transform="translate(795.4 689.2) rotate(131.2)"/>
    </svg>
  );
}
