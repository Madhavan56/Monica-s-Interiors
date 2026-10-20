import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { reveal } from '../../lib/motion.js';
import { toast } from '../../stores/toasts.js';
import { Button, Icon, ProductSkeletons } from '../../components/ui/index.jsx';
import { ProductCard } from '../../components/commerce/ProductCard.jsx';
import { SceneArt } from '../../components/commerce/ProductArt.jsx';
import { useMediaQuery } from '../../lib/hooks.js';

const ROOMS = [['Living room', 'living'], ['Bedroom', 'bedroom'], ['Dining', 'dining'], ['Workspace', 'workspace']];
const PROMISES = [
  ['truck', 'Free delivery over ₹50,000', 'White-glove delivery and assembly in 40 cities.'],
  ['leaf', 'Handcrafted materials', 'Solid wood, natural linen and FSC-certified oak.'],
  ['returnIcon', '30-day returns', 'Live with it first. Free pickup if it isn’t right.'],
  ['sparkle', 'Design consult', 'A free 45-minute session with our studio team.'],
];
const QUOTES = [
  ['The Arden sofa is the first thing guests ask about. Delivery and assembly took twenty minutes.', 'Ananya R.', 'Bengaluru'],
  ['Their design consult saved us from three bad decisions. The oak table is even better in person.', 'Karthik & Meera', 'Chennai'],
  ['Calm, beautiful pieces and a team that actually answers the phone. Rare.', 'Farah S.', 'Mumbai'],
];

function Grid({ sort, count }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', { sort, limit: count }],
    queryFn: () => api(`/products?sort=${sort}&limit=${count}`).then((r) => r.data),
  });
  return (
    <div className="product-grid cols-4">
      {isLoading ? <ProductSkeletons count={4} /> : data.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
    </div>
  );
}

function SectionHead({ id, title, sub, link, linkLabel }) {
  return (
    <motion.div className="section-head" {...reveal()}>
      <div><h2 id={id}>{title}</h2>{sub && <p className="muted">{sub}</p>}</div>
      {link && <Link className="link-underline body-sm" to={link}>{linkLabel}</Link>}
    </motion.div>
  );
}

export default function HomePage() {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <SceneArt name="hero" className="hero-media" describe priority />
        <div className="hero-copy">
          <div className="container">
            <div className="inner">
              <span className="overline">Autumn Collection 2026</span>
              <h1 id="hero-title" className="display">Spaces that feel like you.</h1>
              <p className="body-lg">Handcrafted sofas, solid-wood tables and quiet lighting, made in small batches by makers we know by name.</p>
              <div className="actions">
                <Button as={Link} to="/products" variant="primary" size="lg">Shop the collection</Button>
                <Button size="lg" onClick={() => toast('Design consults open next month. We’ll email you.', { type: 'info' })}>Book a design consult</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="rooms-title">
        <div className="container">
          <SectionHead id="rooms-title" title="Shop by room" link="/products" linkLabel="View all" />
          <div className="rooms">
            {ROOMS.map(([label, scene], i) => (
              <motion.div key={label} {...reveal(i)}>
                <Link className="room-tile" to={`/products?room=${encodeURIComponent(label)}`}>
                  <SceneArt name={scene} ratio="tall" className="scene-fill" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 72vw" />
                  <span className="label"><span>{label}</span><Icon name="arrowRight" size={22} /></span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0" aria-labelledby="new-title">
        <div className="container">
          <SectionHead id="new-title" title="New arrivals" sub="Fresh from the workshop this season." link="/products?sort=newest" linkLabel="See all new arrivals" />
          <Grid sort="newest" count={4} />
        </div>
      </section>

      <section className="section bg-surface-alt" aria-labelledby="story-title">
        <div className="container editorial">
          <motion.div {...reveal()}><SceneArt name="editorial" className="art !aspect-[4/3]" describe sizes="(min-width: 1024px) 55vw, 100vw" /></motion.div>
          <motion.div className="copy" {...reveal(1)}>
            <span className="overline">From the workshop</span>
            <h2 id="story-title">The Halden table takes eleven days to make</h2>
            <p className="muted">Each top is cut from a single run of FSC-certified oak, hand-planed and finished with a hard-wax oil that deepens with every year of family dinners.</p>
            <p className="muted">We work with six family workshops in Karnataka and Rajasthan, and we pay for their time, not their volume.</p>
            <Link className="link-underline link-accent self-start" to="/products?category=Tables">Read the story</Link>
          </motion.div>
        </div>
      </section>

      <section className="section" aria-labelledby="best-title">
        <div className="container">
          <SectionHead id="best-title" title="Bestsellers" link="/products?sort=rating" linkLabel="Shop bestsellers" />
          <Grid sort="featured" count={isMobile ? 6 : 8} />
        </div>
      </section>

      <section className="section pt-0" aria-label="Our promises">
        <div className="container promises">
          {PROMISES.map(([icon, title, body], i) => (
            <motion.div key={title} className="promise" {...reveal(i)}>
              <Icon name={icon} size={28} className="text-accent-text" />
              <h4>{title}</h4>
              <p className="body-sm muted">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section pt-0" aria-labelledby="quotes-title">
        <div className="container">
          <SectionHead id="quotes-title" title="Homes we’ve helped finish" />
          <div className="quotes">
            {QUOTES.map(([q, who, city], i) => (
              <motion.figure key={who} className="quote-card m-0" {...reveal(i)}>
                <blockquote>“{q}”</blockquote>
                <figcaption className="body-sm"><strong>{who}</strong> <span className="faint">· {city}</span></figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0" aria-labelledby="news-title">
        <div className="container">
          <motion.div className="newsletter" {...reveal()}>
            <div>
              <h3 id="news-title">Letters from the studio</h3>
              <p className="muted mt-2">New collections, styling notes and early access to sales. Once a month, never more.</p>
            </div>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^\S+@\S+\.\S+$/.test(email)) { setEmailError(true); toast('Enter an email like name@example.com', { type: 'error', duration: 5000 }); return; }
                setEmailError(false);
                setEmail('');
                toast('You’re on the list. First letter arrives next month.');
              }}
            >
              <label className="sr-only" htmlFor="news-email">Email address</label>
              <input className="input" id="news-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={emailError || undefined} />
              <Button type="submit" variant="primary">Subscribe</Button>
            </form>
          </motion.div>
        </div>
      </section>
    </>
  );
}
