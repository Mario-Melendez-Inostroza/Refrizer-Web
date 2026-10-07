import { BrowserRouter, Route, Routes } from 'react-router'
import { CartProvider } from '@/lib/cart'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Products from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import PaymentReturn from '@/pages/PaymentReturn'
import Services from '@/pages/Services'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="productos" element={<Products />} />
            <Route path="producto/:slug" element={<ProductDetail />} />
            <Route path="carrito" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="pedido/retorno" element={<PaymentReturn />} />
            <Route path="servicios" element={<Services />} />
            <Route path="nosotros" element={<About />} />
            <Route path="contacto" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}
