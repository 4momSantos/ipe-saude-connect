import { useEffect } from 'react';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Observer component that updates CSS variable for sidebar width
 * This allows fixed elements in the editor to respect sidebar positioning
 */
export function SidebarWidthObserver() {
  const { state, open } = useSidebar();

  useEffect(() => {
    // Update CSS variable based on sidebar state
    const sidebarWidth = open ? '280px' : '0px';
    document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
  }, [open, state]);

  return null;
}
