import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, Sparkles, Shield, Zap, MessageCircle, Users, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-gold-500 fill-gold-500" />
            <span className="text-2xl font-bold text-gold-500">Nuru</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-foreground/80 hover:text-gold-500 transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-foreground/80 hover:text-gold-500 transition-colors">
              How It Works
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="gold" className="bg-gold-500 text-black hover:bg-gold-600">
                Join Now
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-500/10 to-transparent" />
        <div className="container mx-auto text-center relative">
          <Badge className="mb-6 bg-gold-500/20 text-gold-500 border-gold-500/30">
            <Sparkles className="h-4 w-4 mr-2" />
            Premium Dating Experience
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gold-200 to-gold-500 bg-clip-text text-transparent">
            Get Your Love Destiny<br />Starts Here
          </h1>
          <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
            Your personal matchmaking helper — discover genuine people, chat with AI
            companions, and build the real connection you've been waiting for, in a
            safe, premium environment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="gold" className="bg-gold-500 text-black hover:bg-gold-600 text-lg px-8">
                Get Started Free
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Member showcase — ladies and men on the platform */}
          <div className="mt-14 flex justify-center items-end gap-3 sm:gap-4">
            {[
              { src: 'https://randomuser.me/api/portraits/women/32.jpg', alt: 'Nuru member' },
              { src: 'https://randomuser.me/api/portraits/men/45.jpg', alt: 'Nuru member' },
              { src: 'https://randomuser.me/api/portraits/women/68.jpg', alt: 'Nuru member', big: true },
              { src: 'https://randomuser.me/api/portraits/men/12.jpg', alt: 'Nuru member' },
              { src: 'https://randomuser.me/api/portraits/women/21.jpg', alt: 'Nuru member' },
            ].map((person, i) => (
              <div
                key={i}
                className={`relative rounded-2xl overflow-hidden border-2 border-gold-500/40 shadow-lg shadow-gold-500/10 ${
                  person.big
                    ? 'h-28 w-28 sm:h-36 sm:w-36'
                    : 'h-20 w-20 sm:h-28 sm:w-28'
                }`}
              >
                <img
                  src={person.src}
                  alt={person.alt}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center gap-8 text-foreground/60">
            <div className="text-center">
              <div className="text-3xl font-bold text-gold-500">50K+</div>
              <div className="text-sm">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gold-500">10K+</div>
              <div className="text-sm">Matches Made</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gold-500">98%</div>
              <div className="text-sm">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Nuru?</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">
              Experience dating reimagined with premium features designed for meaningful connections
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="glass-card hover:border-gold-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-gold-500/20 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-gold-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Verified Profiles</h3>
                <p className="text-foreground/70">
                  All profiles are verified to ensure authenticity and safety for our community.
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card hover:border-gold-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-gold-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-gold-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Matching</h3>
                <p className="text-foreground/70">
                  Our advanced AI helps you find compatible matches based on your preferences.
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card hover:border-gold-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-gold-500/20 flex items-center justify-center mb-4">
                  <MessageCircle className="h-6 w-6 text-gold-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Real-time Messaging</h3>
                <p className="text-foreground/70">
                  Connect instantly with secure, real-time messaging with read receipts.
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card hover:border-gold-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-gold-500/20 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-gold-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Companions</h3>
                <p className="text-foreground/70">
                  Chat with AI companions for practice, advice, or just fun conversations.
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card hover:border-gold-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-gold-500/20 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-gold-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Filters</h3>
                <p className="text-foreground/70">
                  Find exactly what you're looking for with advanced search and filters.
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card hover:border-gold-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-gold-500/20 flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-gold-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Premium Experience</h3>
                <p className="text-foreground/70">
                  Enjoy a premium, ad-free experience with exclusive features and benefits.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Big Photo Gallery */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Real People, Real Chemistry</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">
              Thousands of ladies and gentlemen are already here — your love destiny could be next
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {[
              'https://randomuser.me/api/portraits/women/44.jpg',
              'https://randomuser.me/api/portraits/men/32.jpg',
              'https://randomuser.me/api/portraits/women/65.jpg',
              'https://randomuser.me/api/portraits/men/76.jpg',
              'https://randomuser.me/api/portraits/men/22.jpg',
              'https://randomuser.me/api/portraits/women/8.jpg',
              'https://randomuser.me/api/portraits/women/50.jpg',
              'https://randomuser.me/api/portraits/men/58.jpg',
            ].map((src, i) => (
              <div
                key={i}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-gold-500/30 shadow-lg shadow-gold-500/10 group"
              >
                <img
                  src={src}
                  alt="Nuru member"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-gold-500/5">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-gold-500/20 flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-gold-500">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Profile</h3>
              <p className="text-foreground/70">
                Sign up and create your profile with photos and interests
              </p>
            </div>
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-gold-500/20 flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-gold-500">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Discover & Match</h3>
              <p className="text-foreground/70">
                Browse profiles and like people you're interested in
              </p>
            </div>
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-gold-500/20 flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-gold-500">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect & Chat</h3>
              <p className="text-foreground/70">
                When you match, start chatting and build connections
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-6 w-6 text-gold-500 fill-gold-500" />
                <span className="text-xl font-bold text-gold-500">Nuru</span>
              </div>
              <p className="text-foreground/70 text-sm">
                Where meaningful connections begin.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><Link href="/about" className="hover:text-gold-500">About</Link></li>
                <li><Link href="/careers" className="hover:text-gold-500">Careers</Link></li>
                <li><Link href="/press" className="hover:text-gold-500">Press</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><Link href="/help" className="hover:text-gold-500">Help Center</Link></li>
                <li><Link href="/safety" className="hover:text-gold-500">Safety Tips</Link></li>
                <li><Link href="/contact" className="hover:text-gold-500">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><Link href="/privacy" className="hover:text-gold-500">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-gold-500">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-gold-500">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-foreground/70">
            © 2024 Nuru. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
