const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, BorderStyle, PageNumber,
  Header, Footer, ExternalHyperlink,
} = require('docx')
const fs = require('fs')
const path = require('path')

const OUT = process.argv[2] || path.join(__dirname, 'LearnI_YIC_Proposal.docx')

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text, bold: true, size: 27, font: 'Arial', color: '1a1a2e' })],
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 140 },
    children: [new TextRun({ text, size: 21, font: 'Arial', ...opts })],
  })
}

function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 90 },
    children: Array.isArray(text) ? text : [new TextRun({ text, size: 21, font: 'Arial', ...opts })],
  })
}

function boldRun(text) { return new TextRun({ text, bold: true, size: 21, font: 'Arial' }) }
function normalRun(text) { return new TextRun({ text, size: 21, font: 'Arial' }) }

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'd8d8e8', space: 1 } },
    spacing: { after: 160 },
    children: [],
  })
}

const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 680, hanging: 320 } } } }],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 21 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1260, bottom: 1080, left: 1260 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e0e0e0', space: 1 } },
          children: [new TextRun({ text: 'LearnI — YIC Summer Innovation Challenge 2026 — Round 1 Proposal', size: 16, font: 'Arial', color: '888888' })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', size: 16, font: 'Arial', color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: '888888' }),
            new TextRun({ text: ' of ', size: 16, font: 'Arial', color: '888888' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Arial', color: '888888' }),
          ],
        })],
      }),
    },
    children: [
      // Title block
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: 'LearnI', bold: true, size: 40, font: 'Arial', color: '1a1a2e' })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: 'AI is one of the defining tools of this century — and when it’s aimed at the right goal, it can become something closer to a resource than a shortcut. LearnI’s mission is to point that power directly at learning.', italics: true, size: 20, font: 'Arial', color: '3d2b6b' })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: 'AI-powered, personalized learning support for every Canadian student — regardless of income, postal code, or first language.', italics: true, size: 20, font: 'Arial', color: '3d2b6b' })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: 'Founder: David Nasial Basola  ·  Ottawa, Ontario, Canada  ·  Contact: ', size: 18, font: 'Arial', color: '888888' }),
          new ExternalHyperlink({ link: 'mailto:davidbasola56@gmail.com', children: [new TextRun({ text: 'davidbasola56@gmail.com', style: 'Hyperlink', size: 18, font: 'Arial' })] }),
        ],
      }),
      divider(),

      // 1. Problem
      h1('The Problem'),
      para('Across Canada, students who need extra academic support are often stuck choosing between two bad options: expensive private tutoring, or generic, one-size-fits-all study resources that don’t adapt to what they’re actually struggling with.'),
      para('Private tutoring works — but for many families it isn’t affordable, and in smaller or rural communities a qualified tutor for a given subject may not be available at all. Free alternatives (search engines, unstructured videos, static worksheets) leave students to figure out on their own what to study, when to study it, and whether they’ve actually understood it.'),
      para('This gap falls hardest on three groups:'),
      bullet('Students whose families cannot afford private tutoring'),
      bullet('Self-directed and homeschooled learners without access to a structured curriculum'),
      bullet('Students juggling school with a part-time job or family responsibilities, for whom a rigid, generic study schedule simply doesn’t work'),
      para('The result is a widening gap between students who can access personalized support and those who can’t. It isn’t about how hard a student is willing to work; it’s about what resources they happen to be able to reach. Left unaddressed, that gap tends to compound: a student who falls behind one term without support often struggles more the next, loses confidence along the way, and in some cases disengages from school altogether.'),

      // 2. Idea
      h1('Our Idea: LearnI'),
      para('LearnI is a French-first, bilingual, AI-powered learning platform that turns a student’s own course material into a personal tutor, study planner, and revision system — automatically, and free at the entry level.'),
      bullet([boldRun('Instant quizzes from real course notes.'), normalRun(' A student uploads a PDF or their own notes, and LearnI’s AI generates a custom quiz in seconds — built from what they’re actually learning, not a generic question bank.')]),
      bullet([boldRun('An AI tutor built into every lesson.'), normalRun(' It answers a student’s questions in real time, but it won’t do an assignment for them. It walks them through the reasoning until they get to the answer themselves, since a student who understands why an answer is correct tends to remember it longer and feel more confident on the next one.')]),
      bullet([boldRun('"Mon Cartable" (My Backpack).'), normalRun(' Students organize their coursework into subject binders and learning units, then generate targeted revision exercises — with detailed, plain-language corrections — as many times as they need, at no extra cost per attempt.')]),
      bullet([boldRun('A study plan built around real life.'), normalRun(' Students enter their actual calendar — exam dates, work shifts, family commitments, available evenings — and LearnI’s AI builds a schedule around it. It also reads each student’s quiz results, so subjects they’re struggling with automatically get more study time.')]),
      bullet([boldRun('AI-generated full courses for self-directed learners.'), normalRun(' For students learning outside a formal classroom, LearnI can build a complete structured course — modules, lessons, and exercises — on any topic they choose.')]),
      bullet([boldRun('Flashcards, saved and endlessly reusable.'), normalRun(' Any document can become a set of AI-generated flashcards, saved to a personal library a student can revisit, regenerate for new cards on the same material, or delete — with math and science subjects automatically focused on formulas, theorems, and common mistakes to watch for.')]),
      bullet([boldRun('Peer communities and weekly challenges.'), normalRun(' Students can join subject-based communities to ask questions, share resources, and take on AI-generated weekly challenges together — turning independent study into something students do with their peers, not just alone.')]),
      bullet([boldRun('A dedicated space for teachers.'), normalRun(' Teachers can create a class, share a simple join code with their students, and see quiz results across the whole class — making it easy to spot which students, and which topics, need attention.')]),
      para('LearnI is built as a tiered product: a genuinely useful free tier gives every student access to core quiz generation and progress tracking regardless of income, while affordable paid tiers (starting under $10/month) unlock deeper personalization for students and classroom tools for teachers.'),

      // 3. Impact
      h1('How LearnI Makes Impact'),
      para('LearnI’s mission is educational equity: giving every student — not only those whose families can afford a private tutor — access to learning support that adapts to them.'),
      bullet([boldRun('Democratizing personalized learning.'), normalRun(' By turning a student’s own notes into tutor-quality support, LearnI replicates the core value of private tutoring — individualized feedback — without the price tag that puts it out of reach for many Canadian families.')]),
      bullet([boldRun('Reaching underserved and rural communities.'), normalRun(' Because LearnI is entirely online and doesn’t depend on a qualified tutor being available locally, it extends the same quality of support to students in small or remote communities as students in major cities.')]),
      bullet([boldRun('Built French-first, for Francophone Canada.'), normalRun(' LearnI’s interface was designed in French from day one — a deliberate choice to serve Francophone students across Canada, who are often an afterthought in edtech products built primarily for English-language markets.')]),
      bullet([boldRun('Supporting non-traditional learners.'), normalRun(' Homeschooled students, adult learners returning to education, and self-directed learners exploring a new subject on their own gain access to structured, complete courses that would otherwise require formal enrollment.')]),
      bullet([boldRun('Helping teachers catch struggling students earlier.'), normalRun(' LearnI’s classroom tools let teachers see, at a glance, which students and which subjects need attention — before a student falls too far behind to catch up.')]),
      bullet([boldRun('Keeping costs down as LearnI grows.'), normalRun(' A human tutor charges by the hour, so personalized support stays expensive no matter how many students need it. LearnI’s support comes from AI instead, so the cost of helping one more student stays low even as the number of students grows.')]),
      bullet([boldRun('A healthy example of using AI as a student.'), normalRun(' Young people already use AI daily to learn and get things done. LearnI’s tutor is deliberately designed to build understanding rather than hand over finished answers, so students who use it are also learning what responsible, thoughtful AI use looks like.')]),
      para('Every feature in LearnI was built around one belief: a student’s access to support shouldn’t depend on their family’s income, their postal code, or their first language.'),

      // 4. Implementation Plan
      h1('Implementation Plan'),
      para('LearnI already works end to end today, live at learni-three.vercel.app: quiz generation, the AI tutor, Mon Cartable, the study planner and agenda, flashcards, and teacher tools are all built and usable. The next six months are about turning that working product into a real, operating business.'),
      para('First, the formal steps: David is completing LearnI’s incorporation in Ontario, switching Stripe from test mode to live payments, and purchasing a permanent domain.'),
      para('Second, real-world validation: LearnI has not yet been tested with a real classroom. The plan is to reach out to a small number of schools and homeschool networks in Ottawa, run a pilot, and gather direct feedback from students and teachers. That feedback will guide what gets built next, instead of guessing from the outside what students actually need.'),
      para('Third, team growth: bringing on one or two collaborators is a near-term priority, ideally through connections made during YIC’s mentorship and community, so the venture no longer depends on a single person for everything from writing code to reaching schools.'),

      // 5. Team
      h1('Our Team'),
      para('LearnI is designed and built by David Nasial Basola, a computer engineering student based in Ottawa, Ontario, who has independently built LearnI’s full technology stack — front-end, database, AI integration, and payments — from the ground up.'),
      para('In David’s own words: “The idea for LearnI came out of a personal experience. When I was younger, my parents used to quiz me after I’d read my course notes — a simple method, but a remarkably effective one. As I got older, I couldn’t always count on them being there to review with me, so I started making my own practice tests to simulate the exams ahead. Watching the people around me — parents stretched too thin, kids left to figure out their revision alone — I realized that kind of question-based learning shouldn’t depend on having someone else in the room. I built LearnI so that any student, even studying completely alone, can learn, improve, and walk into their exams ready.”'),
      bullet([boldRun('Strengths: '), normalRun('David’s biggest asset is speed of execution. Every feature in this proposal, from the AI tutor to the study planner, was designed and shipped by one person with no technical co-founder, in a product students can use today. That combination of product thinking and hands-on engineering is rare in an early-stage team.')]),
      bullet([boldRun('Gaps: '), normalRun('LearnI is currently a team of one. We recognize YIC’s guidance that teams typically consist of three or more members, with exceptions considered for teams of two. We reached out to YIC directly about our situation before the submission deadline and have not yet heard back. David also has no formal background in business development or marketing, and LearnI has received no outside funding to date. Bringing on collaborators in those areas, potentially through YIC itself, is the clearest next step.')]),
      new Paragraph({
        spacing: { before: 160, after: 100 },
        children: [new TextRun({ text: 'Our long-term vision for LearnI reaches beyond Canada: to help learners of every age, every discipline, and every background — anywhere in the world — succeed through genuine understanding rather than shortcuts, and grow into confident, capable contributors to their communities and to society at large.', italics: true, size: 21, font: 'Arial', color: '3d2b6b' })],
      }),
      divider(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'LearnI — Youth Impact Challenge, Summer Innovation Challenge 2026 — Round 1 Proposal', size: 16, font: 'Arial', color: '888888' })],
      }),
    ],
  }],
})

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf)
  console.log('✅ Written to', OUT)
}).catch(err => { console.error('❌', err); process.exit(1) })
