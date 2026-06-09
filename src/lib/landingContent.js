// ---------------------------------------------------------------------------
// Static content + sensible defaults for the PUBLIC landing page.
//
// Editable sections (hero / about / principal / contact) are stored in the
// `website_content` table keyed by `section_key`; the landing page merges any
// rows it finds over these defaults. Everything else here (nav, feature cards,
// facilities, imagery) is static marketing content.
//
// Images are high-quality Unsplash placeholders — swap for real school photos
// later by editing the URLs below.
// ---------------------------------------------------------------------------

export const SCHOOL = {
  name: 'Bala Ji Public School',
  motto: 'Nurturing Minds, Building Futures',
  address: 'Jathlana, Yamunanagar-135133, Haryana',
  phone: '9017890654',
  email: 'kuldeep.shastri654@gmail.com',
  officeHours: 'Mon–Sat, 8:00 AM – 2:00 PM',
  classesRange: 'Nursery to Class 9',
  // Used by the WhatsApp button and the Google Maps embed.
  whatsapp: '919017890654',
  mapQuery: 'Jathlana, Yamunanagar, Haryana 135133',
}

// In-page anchor navigation (matches section ids rendered by Landing.jsx).
export const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Academics', href: '#academics' },
  { label: 'Facilities', href: '#facilities' },
  { label: 'Achievements', href: '#achievements' },
  { label: 'Achievers', href: '#achievers' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Contact', href: '#contact' },
]

// Default editable content. Shape mirrors `website_content.content_data` for
// each section_key. The admin Website Content page edits exactly these fields.
export const DEFAULT_CONTENT = {
  hero: {
    headline: 'Nurturing Minds, Building Futures',
    subheadline:
      'Providing quality education from Nursery to Class 9 in the heart of Haryana.',
    motto: 'Nurturing Minds, Building Futures',
  },
  about: {
    heading: 'Welcome to Bala Ji Public School',
    body:
      'Bala Ji Public School, located in Jathlana, Yamunanagar, is dedicated to ' +
      'providing holistic, value-based education from Nursery to Class 9. For ' +
      'years we have nurtured curious, confident and compassionate learners in a ' +
      'safe and supportive environment.\n\n' +
      'Our experienced educators combine a strong academic foundation with ' +
      'co-curricular excellence, helping every child discover their potential and ' +
      'grow into a responsible citizen of tomorrow.',
    vision:
      'To be a centre of excellence that empowers every student with knowledge, ' +
      'values and skills for a rapidly changing world.',
    mission:
      'To provide quality, child-centred education that nurtures intellectual, ' +
      'physical and emotional growth in a caring environment.',
    values: ['Integrity', 'Respect', 'Curiosity', 'Discipline', 'Compassion'],
  },
  principal: {
    name: 'Mr. Kuldeep Shastri',
    title: 'Principal, Bala Ji Public School',
    message:
      'At Bala Ji Public School we believe every child is unique and capable of ' +
      'remarkable things. Our endeavour is to create a warm, stimulating ' +
      'environment where students are encouraged to question, explore and excel. ' +
      'Together with dedicated teachers and supportive parents, we are committed ' +
      'to shaping confident young minds ready to embrace the future.',
  },
  contact: {
    phone: SCHOOL.phone,
    email: SCHOOL.email,
    address: SCHOOL.address,
    officeHours: SCHOOL.officeHours,
    mapQuery: SCHOOL.mapQuery,
  },
}

// Imagery (Unsplash). Sized with query params for fast, crisp loading.
const ux = (id, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

export const IMAGES = {
  hero: ux('1503676260728-1c00da094a0b', 2000),
  about: ux('1577896851231-70ef18881754', 1200),
  principal: ux('1507003211169-0a1dd7228f2d', 800),
}

// Section D — feature badges (no statistics).
export const FEATURES = [
  { icon: 'academic', title: 'Academic Excellence', text: 'A strong, well-rounded curriculum that builds deep understanding.' },
  { icon: 'holistic', title: 'Holistic Development', text: 'Nurturing the mind, body and character of every learner.' },
  { icon: 'infra', title: 'Modern Infrastructure', text: 'Bright classrooms and facilities designed for active learning.' },
  { icon: 'teacher', title: 'Experienced Educators', text: 'Caring, qualified teachers who mentor and inspire.' },
  { icon: 'safe', title: 'Safe Learning Environment', text: 'A secure, welcoming campus where children thrive.' },
  { icon: 'innovate', title: 'Innovation & Creativity', text: 'Encouraging curiosity, problem-solving and creative thinking.' },
]

// Section H — why choose us.
export const WHY_CHOOSE = [
  { icon: 'teacher', title: 'Experienced Faculty', text: 'Dedicated teachers committed to every student’s success.' },
  { icon: 'infra', title: 'Modern Infrastructure', text: 'Smart classrooms and well-equipped facilities.' },
  { icon: 'student', title: 'Student-Centered Learning', text: 'Personalised attention that meets each child where they are.' },
  { icon: 'safe', title: 'Safe Campus Environment', text: 'A protected, nurturing space for growth and play.' },
  { icon: 'trophy', title: 'Co-Curricular Excellence', text: 'Sports, arts and activities that build confidence.' },
  { icon: 'academic', title: 'Strong Academic Foundation', text: 'Concept-driven teaching from the earliest years.' },
]

// Section I — facilities (each with an image).
export const FACILITIES = [
  { title: 'Smart Classrooms', img: ux('1580582932707-520aed937b7b', 800) },
  { title: 'Science Laboratory', img: ux('1532094349884-543bc11b234d', 800) },
  { title: 'Computer Lab', img: ux('1517694712202-14dd9538aa97', 800) },
  { title: 'Library', img: ux('1521587760476-6c12a4b040da', 800) },
  { title: 'Sports Complex', img: ux('1461896836934-ffe607ba8211', 800) },
  { title: 'Auditorium', img: ux('1492684223066-81342ee5ff30', 800) },
  { title: 'Transportation', img: ux('1544620347-c4fd4a3d5957', 800) },
  { title: 'Medical Facility', img: ux('1576091160550-2173dba999ef', 800) },
]

// Section J — achievements (no numerical counters).
export const ACHIEVEMENTS = [
  {
    icon: 'academic',
    title: 'Academic Achievements',
    text: 'Consistently strong results and a culture of academic curiosity, with students recognised in scholarship and olympiad examinations.',
  },
  {
    icon: 'trophy',
    title: 'Sports Achievements',
    text: 'Medals and accolades at district and zonal levels across athletics, kabaddi, cricket and other sports.',
  },
  {
    icon: 'culture',
    title: 'Cultural Achievements',
    text: 'Award-winning performances in dance, music, art and elocution at inter-school cultural events.',
  },
]

// Section L — admission steps.
export const ADMISSION_STEPS = [
  { step: '01', title: 'Enquiry', text: 'Reach out via phone, email or our enquiry form to learn more.' },
  { step: '02', title: 'Visit & Form', text: 'Visit the campus and collect / submit the admission form.' },
  { step: '03', title: 'Interaction', text: 'A friendly interaction with the child and parents.' },
  { step: '04', title: 'Confirmation', text: 'Complete the formalities and secure the admission.' },
]

// Gallery fallback when the `gallery` table is empty.
export const GALLERY_FALLBACK = [
  { id: 'f1', title: 'Campus Life', event_type: 'Around the School', image_url: ux('1577896851231-70ef18881754', 1400) },
  { id: 'f2', title: 'Annual Sports Day', event_type: 'Sports', image_url: ux('1461896836934-ffe607ba8211', 1400) },
  { id: 'f3', title: 'Cultural Program', event_type: 'Culture', image_url: ux('1492684223066-81342ee5ff30', 1400) },
  { id: 'f4', title: 'Science Exhibition', event_type: 'Academics', image_url: ux('1532094349884-543bc11b234d', 1400) },
]

// Resolve landing-page imagery from website_content, falling back to the
// Unsplash placeholders above. Image rows are keyed:
//   hero_image / about_image / principal_photo → content_data { url }
//   facility_1 … facility_8                    → content_data { title, url }
export function resolveLandingImages(content) {
  const facilities = FACILITIES.map((f, i) => {
    const c = (content && content[`facility_${i + 1}`]) || {}
    return { title: c.title || f.title, img: c.url || f.img }
  })
  return {
    hero: content?.hero_image?.url || IMAGES.hero,
    about: content?.about_image?.url || IMAGES.about,
    principal: content?.principal_photo?.url || IMAGES.principal,
    facilities,
  }
}

// Build a section_key -> content_data map from website_content rows, falling
// back to DEFAULT_CONTENT for any missing section or field.
export function mergeContent(rows) {
  const out = JSON.parse(JSON.stringify(DEFAULT_CONTENT))
  for (const row of rows || []) {
    const key = row.section_key
    if (!out[key]) out[key] = {}
    const data = row.content_data || {}
    out[key] = { ...out[key], ...data }
  }
  return out
}
