import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { CartProvider } from '@/lib/cart'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
// Solo la portada se carga de inmediato; las demás páginas se descargan al visitarlas (menos JavaScript al entrar).
const Products = lazy(() => import('@/pages/Products'))
const ProductDetail = lazy(() => import('@/pages/ProductDetail'))
const Cart = lazy(() => import('@/pages/Cart'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const PaymentReturn = lazy(() => import('@/pages/PaymentReturn'))
const Services = lazy(() => import('@/pages/Services'))
const ServiceDetail = lazy(() => import('@/pages/ServiceDetail'))
const Coverage = lazy(() => import('@/pages/Coverage'))
const Delivery = lazy(() => import('@/pages/Delivery'))
const About = lazy(() => import('@/pages/About'))
const Contact = lazy(() => import('@/pages/Contact'))
const NotFound = lazy(() => import('@/pages/NotFound'))

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="productos" element={<Products />} />
            <Route path="categoria/:slug" element={<Products />} />
            <Route path="producto/:slug" element={<ProductDetail />} />
            <Route path="carrito" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="pedido/retorno" element={<PaymentReturn />} />
            <Route path="servicios" element={<Services />} />
            <Route path="servicios/:slug" element={<ServiceDetail />} />
            <Route path="cobertura" element={<Coverage />} />
            <Route path="despacho-y-retiro" element={<Delivery />} />
            <Route path="nosotros" element={<About />} />
            <Route path="contacto" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}
