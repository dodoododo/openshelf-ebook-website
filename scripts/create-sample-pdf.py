"""Rebuild the original CC0 development fixture (requires reportlab).

No downloaded text, images, or embedded third-party fonts are used.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit

OUTPUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "sample.pdf"
CHAPTERS = [
    ("A Quiet Place to Read", "A small invitation", [
        "There is a particular kind of quiet that arrives when a book is opened. The room does not change, but our attention does. A chair becomes a destination. A window becomes a source of light.",
        "These five pages are a little space to pause. There is no list to finish and no clock to beat. Turn a page, follow a sentence, and give the next thought a moment to settle.",
        "OpenShelf begins here: with a page, a place, and a reader. The rest can wait.",
    ]),
    ("Make a little room", "01 / The reading corner", [
        "A reading corner need not be a separate room. It may be the end of a table, a seat beside a plant, or a familiar step in the afternoon sun. What matters is the small decision to return to it.",
        "Set down a glass of water. Move the things that ask for your attention just beyond reach. Let the light fall across the page. These ordinary gestures can mark the border between a busy day and a few unhurried minutes.",
        "When we make room for reading, we make room for a different pace. The book will still be here tomorrow, holding its place without complaint.",
    ]),
    ("Follow one sentence", "02 / The shape of attention", [
        "Sometimes a single sentence is enough. We read it once for its meaning, again for its rhythm, and a third time because it has made us notice something we had passed by.",
        "Attention is not always a bright beam. It can be a small, steady light. A paragraph offers a path through a thought, and each line gives us somewhere to place the next step.",
        "There is no correct speed for this kind of journey. Some pages invite a quick crossing. Others ask us to sit beside them for a while.",
    ]),
    ("Leave a place to return", "03 / Between the pages", [
        "A pause is part of reading. The kettle calls, the afternoon changes, or someone opens the door. We leave the story for a moment and carry a little of it into the rest of the day.",
        "A remembered page is an invitation to return. It tells us that an unfinished thought can wait, and that we do not have to begin again every time we stop.",
        "Close the book when you need to. The next page is patient. A good reading space keeps your place and lets you choose the moment to continue.",
    ]),
    ("Carry something with you", "04 / An open shelf", [
        "At the end of a short book, we may remember an image, a question, or simply the feeling of having spent a little time elsewhere. Not every reading needs to leave a lesson.",
        "Perhaps the useful thing is the habit itself: making a place, offering our attention, and returning when we can. A shelf is built one book at a time. A reading life is built one ordinary day at a time.",
        "This is the last page of our sample, and the beginning of whatever you choose to read next.",
    ]),
]

pdf = canvas.Canvas(str(OUTPUT), pagesize=(480, 680), invariant=1)
pdf.setTitle("A Quiet Place to Read")
pdf.setAuthor("OpenShelf")
pdf.setSubject("Original CC0 1.0 development sample; freely redistributable")
for index, (title, subtitle, paragraphs) in enumerate(CHAPTERS, 1):
    pdf.setFillColor(HexColor("#FCFAF6"))
    pdf.rect(0, 0, 480, 680, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#5A685E"))
    pdf.setFont("Helvetica", 8)
    pdf.drawString(52, 628, "O P E N S H E L F   /   A  R E A D I N G  C O M P A N I O N")
    pdf.setStrokeColor(HexColor("#D1D6CB"))
    pdf.line(52, 612, 428, 612)
    pdf.setFillColor(HexColor("#765238"))
    pdf.setFont("Helvetica", 9)
    pdf.drawString(52, 558, subtitle.upper())
    pdf.setFillColor(HexColor("#24372E"))
    pdf.setFont("Times-Roman", 29)
    y = 515
    for line in simpleSplit(title, "Times-Roman", 29, 376):
        pdf.drawString(52, y, line)
        y -= 34
    y -= 24
    pdf.setFont("Times-Roman", 13)
    for paragraph in paragraphs:
        for line in simpleSplit(paragraph, "Times-Roman", 13, 376):
            pdf.drawString(52, y, line)
            y -= 20
        y -= 14
    assert y > 100, "Text must remain above the footer"
    pdf.setStrokeColor(HexColor("#D1D6CB"))
    pdf.line(52, 76, 428, 76)
    pdf.setFillColor(HexColor("#5A685E"))
    pdf.setFont("Helvetica", 8)
    pdf.drawString(52, 57, "ORIGINAL DEVELOPMENT SAMPLE / CC0 1.0")
    pdf.drawRightString(428, 57, str(index))
    pdf.showPage()
pdf.save()
print(f"Created {OUTPUT.name}: {len(CHAPTERS)} pages, {OUTPUT.stat().st_size} bytes")
