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
import SharedReport from './pages/SharedReport.jsx'
import { POSTS } from './blog/posts.js'
import { redactShareUrl } from './lib/share.js'

// Root layout: renders the matched route plus the analytics beacon. Shared
// report paths carry their token, so analytics sees /r/[token] instead.
function RootLayout() {
  return (
    <>
      <Outlet />
      <Analytics beforeSend={redactShareUrl} />
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
      // Shared reports are fetched in the browser. One shell is prerendered
      // (r/shell.html, in its loading state) and vercel.json rewrites every
      // /r/:token to it, so the client hydrates matching markup.
      {
        path: 'r/:token',
        element: <SharedReport />,
        entry: 'src/pages/SharedReport.jsx',
        getStaticPaths: () => ['r/shell'],
      },
    ],
  },
]

export const createRoot = ViteReactSSG({ routes })
