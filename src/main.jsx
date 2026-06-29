import { ViteReactSSG } from 'vite-react-ssg'
import { Outlet } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import './i18n.js'
import App from './App.jsx'
import Compare from './pages/Compare.jsx'
import Privacy from './pages/Privacy.jsx'
import Blog from './pages/Blog.jsx'
import BlogPost from './pages/BlogPost.jsx'
import { POSTS } from './blog/posts.js'

// Root layout: renders the matched route plus the analytics beacon.
function RootLayout() {
  return (
    <>
      <Outlet />
      <Analytics />
    </>
  )
}

// React Router data routes, prerendered to static HTML at build time by
// vite-react-ssg. Dynamic blog routes are enumerated via getStaticPaths so
// every article ships as its own crawlable HTML file.
export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <App /> },
      { path: 'compare', element: <Compare /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'blog', element: <Blog /> },
      {
        path: 'blog/:slug',
        element: <BlogPost />,
        entry: 'src/pages/BlogPost.jsx',
        getStaticPaths: () => POSTS.map((p) => `blog/${p.slug}`),
      },
    ],
  },
]

export const createRoot = ViteReactSSG({ routes })
