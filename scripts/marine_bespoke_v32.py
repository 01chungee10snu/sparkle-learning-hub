"""Six species-specific, independent, original vector silhouettes (v32)."""
from html import escape
import math

BESPOKE = {"giant-squid", "manta-ray", "mandarinfish", "longnose-butterflyfish",
           "american-lobster", "leatherback-turtle"}
NAMES = {"giant-squid":"대왕오징어","manta-ray":"대왕쥐가오리","mandarinfish":"만다린피시",
         "longnose-butterflyfish":"긴주둥이나비고기","american-lobster":"아메리카바닷가재",
         "leatherback-turtle":"장수거북"}

def p(d, fill="none", stroke="none", sw=0, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'

def squid():
    # Central mantle points upward; paired lateral fins, eight short arms and two longer feeding tentacles.
    s=p("M441 337 Q363 293 348 240 Q410 235 463 277 L558 277 Q621 235 687 241 Q667 307 577 342","url(#fin)","#743b61",5)
    s+=p("M504 157 C423 220 405 320 430 409 Q487 467 580 410 C618 326 589 219 504 157 Z","url(#body)","#704767",8)
    s+=p("M492 199 Q445 293 463 391 Q501 430 555 391","none","#ffe3e9",12,'opacity=".58"')
    s+=p("M433 407 Q505 440 579 404 L571 464 Q508 506 443 465 Z","url(#fin)","#704767",6)
    for i in range(8):
        x=446+i*17; delta=i-3.5
        endpoint=x+delta*23
        s+=p(f"M{x} 458 Q{x+delta*12:.1f} 524 {endpoint:.1f} {574+int(i%3)*14} Q{endpoint+delta*7:.1f} 606 {endpoint+delta*13:.1f} 573","none","#b8758e",12)
        for j in range(2):
            xx=x+delta*8*(j+1);yy=492+j*35
            s+=f'<circle cx="{xx:.1f}" cy="{yy}" r="3.8" fill="#ffe1d9" opacity=".72"/>'
    s+=p("M480 467 C445 524 336 507 289 561 S235 673 174 695","none","#a65e81",9)
    s+=p("M537 467 C577 531 685 503 733 567 S791 673 850 697","none","#a65e81",9)
    s+=p("M173 694 q-28 2 -31 18 M851 696 q28 -3 35 15","none","#d99bb3",12)
    s+='<circle cx="463" cy="429" r="10" fill="#fff5ee"/><circle cx="545" cy="429" r="10" fill="#fff5ee"/><circle cx="465" cy="429" r="5" fill="#27324a"/><circle cx="547" cy="429" r="5" fill="#27324a"/>'
    return s

def manta():
    s=p("M493 300 Q320 262 101 209 Q159 360 373 441 Q433 472 509 489 Q584 465 650 434 Q864 358 924 211 Q694 268 529 300 Z","url(#body)","#294f68",9)
    s+=p("M254 324 Q391 383 498 459 Q609 386 768 324 Q667 453 512 492 Q355 466 254 324","url(#belly)")
    s+=p("M422 304 Q363 274 312 301 Q330 348 441 358","url(#fin)","#294f68",6)
    s+=p("M591 305 Q665 271 712 298 Q691 341 576 361","url(#fin)","#294f68",6)
    s+=p("M510 480 C529 571 527 632 516 703","none","#325773",9)
    s+=p("M184 265 Q339 360 443 381 M830 266 Q698 358 590 381","none","#a9ebf2",10,'opacity=".55"')
    s+='<ellipse cx="459" cy="357" rx="10" ry="7" fill="#142b43"/><ellipse cx="552" cy="357" rx="10" ry="7" fill="#142b43"/>'
    return s

def mandarin():
    s=p("M309 395 Q199 285 131 323 Q186 389 131 487 Q241 490 316 432","url(#fin)","#124f9d",7)
    s+=p("M421 320 Q444 192 534 279 L566 331 M444 465 Q461 545 577 466","url(#fin)","#1554a4",5)
    s+=p("M307 384 C369 290 533 268 693 337 Q778 371 805 414 Q750 474 616 510 Q406 539 310 440 Z","url(#body)","#12498f",9)
    # Contiguous irregular labyrinth rather than generic stripes or dots.
    curves=["M343 394 C371 341 423 343 446 376 S493 423 523 371 S591 320 616 364",
            "M338 433 Q391 482 444 443 T540 441 Q584 476 649 424 T755 411",
            "M416 316 C461 331 461 365 493 352 S536 305 566 325",
            "M554 491 C587 452 630 470 659 450 S692 383 750 373",
            "M378 402 Q421 382 440 419 Q468 450 500 420 Q530 397 561 405",
            "M607 353 Q654 366 657 395 Q659 415 691 407"]
    for d in curves:s+=p(d,"none","#ffae4d",14)
    for x,y in [(397,350),(471,470),(554,347),(626,472),(701,384)]:
        s+=f'<circle cx="{x}" cy="{y}" r="8" fill="#ffdc75" stroke="#ef863e" stroke-width="3"/>'
    s+=p("M375 363 Q491 279 629 334","none","#87e9f1",8,'opacity=".60"')
    s+='<ellipse cx="728" cy="373" rx="17" ry="19" fill="#f2fbfa"/><circle cx="732" cy="372" r="10" fill="#182b43"/><circle cx="728" cy="367" r="4" fill="white"/>'
    return s

def butterfly():
    s=p("M368 384 Q269 297 226 329 L243 408 L223 494 Q294 488 370 425","url(#fin)","#a35b32",5)
    s+=p("M444 310 Q445 202 545 251 L578 322 M466 471 Q485 569 583 501","url(#fin)","#bc6d35",5)
    s+=p("M355 383 Q387 287 495 276 Q662 277 709 372 Q733 420 664 478 Q507 545 396 462 Q352 433 355 383 Z","url(#body)","#945e37",8)
    s+=p("M686 368 Q769 349 907 371 Q946 381 906 391 Q763 409 687 402 Z","url(#snout)","#97552e",6)
    s+=p("M747 393 Q848 398 918 385","none","#5e403b",4)
    for x in (443,539,628):s+=p(f"M{x} 291 Q{x+32} 388 {x} 493","none","#fdf5e6",24)
    s+=p("M376 364 Q477 269 600 310","none","#fff6de",8,'opacity=".6"')
    s+='<circle cx="662" cy="353" r="14" fill="#f9efda"/><circle cx="665" cy="353" r="7" fill="#24314a"/>'
    return s

def lobster():
    s=p("M267 380 L129 294 Q111 352 168 399 L126 479 Q210 471 283 433 Z","url(#fin)","#654157",8)
    for x,rx in [(315,44),(370,51),(429,58),(490,61)]:
        s+=f'<ellipse cx="{x}" cy="404" rx="{rx}" ry="{68-(x-315)//15}" fill="url(#body)" stroke="#663f52" stroke-width="6"/>'
        s+=p(f"M{x-20} 360 Q{x} 340 {x+12} 365","none","#ffe0c5",6,'opacity=".6"')
    s+=p("M486 344 Q568 277 659 310 Q714 359 683 431 Q624 503 504 458 Z","url(#body)","#653f53",9)
    for y in (364,388,413,438):s+=p(f"M541 {y} Q611 {y-18} 655 {y+3}","none","#ffd2b8",4,'opacity=".45"')
    # Two thick limbs and genuinely closed asymmetrical pincer silhouettes.
    s+=p("M578 327 C600 256 640 214 685 181","none","#815069",30)
    s+=p("M681 187 Q644 98 710 95 Q773 113 770 180 Q752 211 712 227 L733 167 Q697 186 681 187 Z","url(#claw)","#69384b",8)
    s+=p("M628 433 C669 509 730 552 760 573","none","#815069",34)
    s+=p("M751 573 Q763 489 828 515 Q871 537 847 600 Q812 637 780 630 L810 581 Q783 605 751 573 Z","url(#claw)","#69384b",8)
    s+=p("M544 306 Q591 214 636 155 M560 304 Q626 230 716 214","none","#ad7481",5)
    for x in (345,393,446,526,575,618):
        s+=p(f"M{x} 448 Q{x-23} 515 {x+3} 555","none","#76485e",8)
    s+='<circle cx="651" cy="332" r="11" fill="#fff0da"/><circle cx="654" cy="332" r="6" fill="#2b283a"/>'
    return s

def leatherback():
    # Seven long, raised ridges; powerful elongated front flippers.
    s=p("M399 352 Q256 244 96 183 Q109 307 344 449 Z","url(#fin)","#334e62",9)
    s+=p("M630 346 Q776 241 931 176 Q918 318 694 449 Z","url(#fin)","#334e62",9)
    s+=p("M389 473 Q276 578 327 617 Q439 572 477 504 M623 483 Q726 584 704 625 Q594 582 556 510","url(#fin)","#344d61",7)
    s+=p("M672 389 Q769 353 843 398 Q871 446 767 472 L671 439","url(#body)","#3c5669",8)
    s+=p("M294 404 C313 291 408 261 507 258 C621 258 708 305 727 407 Q705 524 511 547 Q331 538 294 404 Z","url(#body)","#253f5c",11)
    for i in range(7):
        x=342+i*53
        s+=p(f"M{x} {343-abs(3-i)*12} Q{x+12} 404 {x+5} {488+max(0,3-abs(3-i))*12}","none","#a8bdc3",10 if i in (0,6) else 8,'opacity=".83"')
        s+=p(f"M{x-4} {346-abs(3-i)*12} Q{x+8} 407 {x+1} {489+max(0,3-abs(3-i))*12}","none","#e0edf0",3,'opacity=".65"')
    s+=p("M116 226 Q220 335 363 386 M908 220 Q795 336 656 391","none","#b4d3d8",11,'opacity=".51"')
    s+='<circle cx="807" cy="409" r="11" fill="#faf4e6"/><circle cx="809" cy="409" r="6" fill="#1b2f42"/>'
    return s

ART = {"giant-squid":squid,"manta-ray":manta,"mandarinfish":mandarin,
       "longnose-butterflyfish":butterfly,"american-lobster":lobster,
       "leatherback-turtle":leatherback}
COLORS={"giant-squid":("#edb1c5","#a26383"),"manta-ray":("#7199a9","#274f65"),
        "mandarinfish":("#46bacc","#184b9a"),"longnose-butterflyfish":("#ffe9bb","#e7994b"),
        "american-lobster":("#d28c83","#85546b"),"leatherback-turtle":("#708f9d","#25405b")}

def make_bespoke(identifier):
    a,b=COLORS[identifier]
    defs=f'''<defs>
<linearGradient id="body" x1=".18" y1=".08" x2=".84" y2="1"><stop stop-color="{a}"/><stop offset=".43" stop-color="{b}"/><stop offset="1" stop-color="{a}"/></linearGradient>
<linearGradient id="fin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>
<linearGradient id="claw" x1=".1" y1=".1" x2=".85" y2=".9"><stop stop-color="#edac99"/><stop offset=".6" stop-color="#a85466"/><stop offset="1" stop-color="#744158"/></linearGradient>
<linearGradient id="snout" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#f6dea6"/><stop offset="1" stop-color="#d58d45"/></linearGradient>
<linearGradient id="belly" x1=".25" y1="0" x2=".6" y2="1"><stop stop-color="#e7f8f1" stop-opacity=".15"/><stop offset=".7" stop-color="#c2e3df" stop-opacity=".77"/><stop offset="1" stop-color="#8bb8bc" stop-opacity=".65"/></linearGradient>
</defs>'''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1152" viewBox="0 0 1024 768" role="img" aria-label="{escape(NAMES[identifier])}">'
            +defs+'<g id="v32-bespoke">'+ART[identifier]()+'</g></svg>')
