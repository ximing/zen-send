declare module 'react-native-drawer' {
  import { Component, ReactNode } from 'react';

  interface DrawerProps {
    type?: 'overlay' | 'static' | 'displace';
    content?: ReactNode;
    children?: ReactNode;
    open?: boolean;
    onClose?: () => void;
    onOpen?: () => void;
    tapToClose?: boolean;
    openDrawerOffset?: number | ((viewportWidth: number) => number);
    panCloseMask?: number;
    panOpenMask?: number;
    disabled?: boolean;
    styles?: {
      drawer?: object;
      main?: object;
      drawerOverlay?: object;
    };
    className?: string;
    side?: 'left' | 'right';
    acceptDoubleTap?: boolean;
    acceptTap?: boolean;
    acceptPanOnHiShadow?: boolean;
    hiWidth?: number;
    bgWidth?: number;
    bgColor?: string;
    overlayOpacity?: number;
    overlayColor?: string;
    negotiatePan?: boolean;
    useNativeDriver?: boolean;
    enabled?: boolean;
    elevation?: number;
    hash?: string;
    ratio?: number;
    tapToggle?: boolean;
    withSwipe?: boolean;
    fullWidth?: boolean;
  }

  export default class Drawer extends Component<DrawerProps> {}
}