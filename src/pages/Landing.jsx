import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { DEFAULT_CONTENT, mergeContent, resolveLandingImages, GALLERY_FALLBACK } from '../lib/landingContent.js'
import LandingHeader from '../components/landing/LandingHeader.jsx'
import LandingHero from '../components/landing/LandingHero.jsx'
import LandingGallery from '../components/landing/LandingGallery.jsx'
import LandingToppers from '../components/landing/LandingToppers.jsx'
import LandingContact from '../components/landing/LandingContact.jsx'
import LandingFooter from '../components/landing/LandingFooter.jsx'
import {
  Features, About, Principal, WhyChooseUs, Facilities, Achievements,
  AnnouncementsSection, Admissions,
} from '../components/landing/LandingSections.jsx'

// Public, unauthenticated landing page. Reads only public data (website_content,
// gallery, announcements where audience = 'all') via the anon key. Any fetch
// failure falls back silently to hardcoded defaults/placeholders so the page
// always renders for visitors.
export default function Landing() {
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [photos, setPhotos] = useState(GALLERY_FALLBACK)
  const [announcements, setAnnouncements] = useState([])
  const [toppers, setToppers] = useState([])

  useEffect(() => {
    let active = true
    ;(async () => {
      const [contentRes, galleryRes, annRes, toppersRes] = await Promise.allSettled([
        supabase.from('website_content').select('section_key, content_data'),
        supabase.from('gallery').select('id, title, event_type, image_url').order('created_at', { ascending: false }).limit(8),
        supabase.from('announcements').select('id, title, description, created_at').eq('audience', 'all').order('created_at', { ascending: false }).limit(5),
        supabase.from('toppers').select('id, student_name, class_name, percentage, session_name, photo_url, achievement_type').order('percentage', { ascending: false }),
      ])
      if (!active) return

      if (contentRes.status === 'fulfilled' && contentRes.value.data?.length) {
        setContent(mergeContent(contentRes.value.data))
      }
      if (galleryRes.status === 'fulfilled' && galleryRes.value.data?.length) {
        setPhotos(galleryRes.value.data)
      }
      if (annRes.status === 'fulfilled' && annRes.value.data) {
        setAnnouncements(annRes.value.data)
      }
      if (toppersRes.status === 'fulfilled' && toppersRes.value.data) {
        setToppers(toppersRes.value.data)
      }
    })()
    return () => { active = false }
  }, [])

  const images = resolveLandingImages(content)

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader motto={content.hero.motto} />
      <main>
        <LandingHero hero={content.hero} image={images.hero} />
        <Features />
        <About about={content.about} image={images.about} />
        <Principal principal={content.principal} image={images.principal} />
        <LandingGallery photos={photos} />
        <WhyChooseUs />
        <LandingToppers toppers={toppers} />
        <Facilities items={images.facilities} />
        <Achievements />
        <AnnouncementsSection announcements={announcements} />
        <Admissions />
        <LandingContact contact={content.contact} />
      </main>
      <LandingFooter />
    </div>
  )
}
