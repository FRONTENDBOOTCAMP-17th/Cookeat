import { SidebarProvider } from '@/components/ui/sidebar';
import SellerAuthGuard from './components/SellerAuthGuard';
import Header from './components/Header/Header';
import SellerSidebar from './components/Sidebar/SellerSidebar';
import SellerMobileDrawer from './components/Sidebar/SellerMobileDrawer';
import SellerAdminViewInitializer from './components/SellerAdminViewInitializer';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SellerAuthGuard>
      <SellerAdminViewInitializer />
      <Header />
      <SellerMobileDrawer />
      <div className="flex flex-1 min-w-0">
        <SidebarProvider style={{ minHeight: '6.25rem' }}>
          <SellerSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <main className="seller-page-shell flex flex-1 flex-col min-w-0">{children}</main>
          </div>
        </SidebarProvider>
      </div>
    </SellerAuthGuard>
  );
}
