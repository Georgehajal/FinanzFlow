import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { IconName } from '../data/categories';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}

export default function CFIcon({ name, size = 18, color = '#fff', stroke = 2 }: Props) {
  const p = { fill: 'none' as const, stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'utensils':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 3v7a2 2 0 002 2v9M6 3v7M8 3v7" {...p}/><Path d="M16 3c-1.5 0-3 2-3 5s1.5 4 3 4v9" {...p}/></Svg>;
    case 'bag':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 9h16l-1 11H5L4 9zM8 9V6a4 4 0 018 0v3" {...p}/></Svg>;
    case 'coin':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" {...p}/><Path d="M12 7v10M9 10h4a2 2 0 010 4H9" {...p}/></Svg>;
    case 'heart':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" {...p}/></Svg>;
    case 'car':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 13l2-6h14l2 6M3 13v5h3v-2h12v2h3v-5M3 13h18" {...p}/><Circle cx="7" cy="15" r="1.3" {...p}/><Circle cx="17" cy="15" r="1.3" {...p}/></Svg>;
    case 'music':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 18V6l11-2v12" {...p}/><Circle cx="7" cy="18" r="2.5" {...p}/><Circle cx="18" cy="16" r="2.5" {...p}/></Svg>;
    case 'cross':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 4v16M4 12h16" {...p}/></Svg>;
    case 'dot':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="6" cy="12" r="1.5" fill={color}/><Circle cx="12" cy="12" r="1.5" fill={color}/><Circle cx="18" cy="12" r="1.5" fill={color}/></Svg>;
    case 'wallet':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 7a2 2 0 012-2h13v4M3 7v11a2 2 0 002 2h14a2 2 0 002-2v-9H5a2 2 0 01-2-2z" {...p}/><Circle cx="17" cy="14" r="1.3" fill={color}/></Svg>;
    case 'gift':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 10h16v3H4zM5 13v8h14v-8M12 10v11M9 10a3 3 0 010-6c2 0 3 3 3 6m0 0c0-3 1-6 3-6a3 3 0 010 6" {...p}/></Svg>;
    case 'home':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" {...p}/></Svg>;
    case 'list':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" {...p}/></Svg>;
    case 'chart':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 20V10M10 20V4M16 20v-8M22 20H2" {...p}/></Svg>;
    case 'plus':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" {...p}/></Svg>;
    case 'minus':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 12h14" {...p}/></Svg>;
    case 'arrowUp':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 19V5M5 12l7-7 7 7" {...p}/></Svg>;
    case 'arrowDown':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 5v14M5 12l7 7 7-7" {...p}/></Svg>;
    case 'arrowLeft':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M19 12H5M12 5l-7 7 7 7" {...p}/></Svg>;
    case 'chevron':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" {...p}/></Svg>;
    case 'chevronDown':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" {...p}/></Svg>;
    case 'check':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 12l5 5L20 6" {...p}/></Svg>;
    case 'close':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" {...p}/></Svg>;
    case 'search':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="11" cy="11" r="7" {...p}/><Path d="M21 21l-4.3-4.3" {...p}/></Svg>;
    case 'bell':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 20a2 2 0 004 0" {...p}/></Svg>;
    case 'gear':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="3" {...p}/><Path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.5-2.4.9c-.6-.5-1.3-.9-2-1.2L14 3h-4l-.5 2.5c-.7.3-1.4.7-2 1.2L5.1 5.8l-2 3.5 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-.9c.6.5 1.3.9 2 1.2L10 21h4l.5-2.5c.7-.3 1.4-.7 2-1.2l2.4.9 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z" {...p}/></Svg>;
    case 'pdf':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" {...p}/><Path d="M14 3v6h6M9 14h2a1.5 1.5 0 010 3H9v-3zM9 14v6M15 14h-2v6M13 17h2" {...p}/></Svg>;
    case 'share':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3v13M8 7l4-4 4 4M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" {...p}/></Svg>;
    case 'calendar':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="3" y="5" width="18" height="16" rx="2" {...p}/><Path d="M3 10h18M8 3v4M16 3v4" {...p}/></Svg>;
    case 'tag':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 12V4h8l10 10-8 8L3 12z" {...p}/><Circle cx="8" cy="8" r="1.4" fill={color}/></Svg>;
    case 'note':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 3h11l5 5v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" {...p}/><Path d="M16 3v5h5M8 13h8M8 17h5" {...p}/></Svg>;
    case 'sliders':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 6h16M4 12h16M4 18h16" {...p}/><Circle cx="9" cy="6" r="2" fill={color}/><Circle cx="15" cy="12" r="2" fill={color}/><Circle cx="7" cy="18" r="2" fill={color}/></Svg>;
    case 'trend':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 17l6-6 4 4 8-9M14 6h7v7" {...p}/></Svg>;
    case 'star':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" {...p}/></Svg>;
    case 'sync':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 12a9 9 0 0115-6.7L21 8M3 12v-5M21 12a9 9 0 01-15 6.7L3 16M21 12v5" {...p}/></Svg>;
    case 'lock':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="4" y="10" width="16" height="11" rx="2" {...p}/><Path d="M8 10V7a4 4 0 018 0v3" {...p}/></Svg>;
    case 'info':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" {...p}/><Path d="M12 11v6M12 7h.01" {...p}/></Svg>;
    default:
      return null;
  }
}
