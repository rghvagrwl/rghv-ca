# Bookshelf edition references

Dimensions are width × height × spine thickness. Trim describes the printed edition. The thickness of a bound copy can vary with its printing. The WebP textures depict these editions in the local 3D study. The cited publishers, designers, and photographers retain rights to their artwork and photographs. The source pages do not state an open license for the cover images.

The ten additional editions have separate notes for [design and typography](design-editions.md), [work and creativity](reading-editions.md), and [habits and making](making-editions.md).

To add a book, identify its ISBN and printing first. Record its closed dimensions, binding and paper stock in the catalog, then add the front, back and spine to `public/books` as `<id>.webp`, `<id>-back.webp` and `<id>-spine.webp`. Keep each panel upright as seen from outside the book. Run `node scripts/build-book-previews.mjs` to repack the shelf and update the artwork URLs.

## Virgil Abloh. Nike. ICONS

TASCHEN’s English hardcover, ISBN 9783836585095, has 352 pages and measures 255 × 297 mm. The modeled depth of 30 mm follows a retailer’s measurement. The Swiss binding attaches the text block at the rear. When the book is closed, its green printed spine covers the folded signatures. The cover photographs show a fine cloth grain, black ink, and the original 1971 Nike swoosh. [Publisher’s edition](https://www.taschen.com/en/books/fashion/08018/virgil-abloh-nike-icons/) · [Depth reference](https://www.bookdelivery.com/ca-en/book-virgil-abloh-nike-icons/9783836585095/p/53268495)

`icons.webp` comes from Zak Group’s photograph of the original 2021 front. `icons-spine.webp` rectifies the printed spine from TASCHEN’s large product photograph. The black lettering and original surface grain are separated from the directional studio light and mapped to the front cover’s green cloth color. `icons-back.webp` uses the original back-cover photograph credited to Prudence Cuming / Zak Group. [Zak Group’s design and photography](https://www.zak.group/projects/icons) · [TASCHEN product photograph](https://taschen.makaira.media/taschen/image/upload/f_webp,w_1200/v1673546730/products-live/d1a37d2b5f22d2e455281b65ec91e6e3.jpg) · [Back cover, image 9](https://hypebae.com/2021/1/virgil-abloh-nike-off-white-icons-book-retrospective-collaboration-taschen-sneakers-release-date-info)

## Shoe Dog

Phil Knight’s 400-page US Scribner hardcover, ISBN 9781501135910, was published in 2016. The modeled 152.4 × 228.6 × 27.9 mm follows a bookseller’s listing for this printing. [Publisher’s edition](https://www.simonandschuster.com/books/Shoe-Dog/Phil-Knight/9781501135910) · [Dimensions](https://www.betterworldbooks.com/product/detail/shoe-dog-a-memoir-by-the-creator-of-nike-9781501135910)

`shoe-dog.webp` and `shoe-dog-back.webp` use Scribner’s front and back jacket artwork. The front shows the publisher’s later bestseller banner. `shoe-dog-spine.webp` reconstructs the copper-colored lettering, red swoosh, and imprint arrangement from Burnside Rare Books’ photographs of the jacket. The lettering is rendered from type outlines with subtle copper-color variation. The upright flame and small name at the foot come from Scribner’s imprint art. The type and foil response are approximations. [Publisher’s imprint](https://scribnerbooks.com/about.html) · [Publisher’s front](https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781501135910/shoe-dog-9781501135910_hr.jpg) · [Publisher’s back](https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781501135910/untitled-9781501135910_hr-back.jpg) · [Photographed first printing](https://www.ebay.com/itm/336756202693)

## Steve Jobs

Walter Isaacson’s 2011 US Simon & Schuster hardcover, ISBN 9781451648539, has 656 pages. Simon & Schuster’s catalog gives a 6⅛ × 9¼ in trim, rounded to 156 × 235 mm here. The modeled depth is approximately 46 mm, consistent with the 1.81 in reported for a physical copy. [Publisher’s catalog](https://d1hbl61hovme3a.cloudfront.net/assets_us/100th-anniversary.pdf) · [Booksellers’ copy descriptions](https://www.abebooks.com/servlet/SearchResults?bi=h&cm_sp=mbc-_-ISBN-_-filter&isbn=9781451648539&sortby=100)

`steve-jobs.webp` uses the publisher’s front featuring Albert Watson’s portrait. `steve-jobs-back.webp` shows Norman Seeff’s portrait of Jobs with the Macintosh. That photo comes from the jacket released before publication. `steve-jobs-spine.webp` uses the original jacket as a layout guide. The Helvetica lettering, imprint wordmark and traced Sower are rendered at 2,560 pixels tall to retain their contours on the curved spine. [Publisher’s front](https://www.simonandschuster.com/books/Steve-Jobs/Walter-Isaacson/9781451648539) · [Isaacson’s design and photo credits in Fortune](https://fortune.com/2011/08/16/a-peek-at-steve-jobs-book-jacket-front-back-and-spine/) · [Full jacket reference](https://www.iclarified.com/16502/front-and-back-cover-of-the-upcoming-steve-jobs-biography-photo)

## Grid Systems in Graphic Design

Josef Müller-Brockmann's bilingual Niggli hardcover, ISBN 9783721201451, has 176 pages. Niggli lists a 210 × 300 mm format. The modeled 20 mm thickness comes from a bookseller's measurement of a physical printing. [Publisher's edition record](https://niggli.ch/en/products/rastersysteme-fur-die-visuelle-gestaltung) · [Measured copy](https://nagaihiru.theshop.jp/items/81419912)

`public/books/grid-systems.webp` uses a high-resolution scan of the printed front, with the orange stock matched to Niggli’s product image. `public/books/grid-systems-spine.webp` reconstructs the four printed groups on the spine from a photograph of the physical book. The typeface, ink color, and finish are visual approximations. [Print cover scan](https://commons.wikimedia.org/wiki/File:Raster-Systeme-Cover.jpg) · [Publisher color reference](https://niggli.ch/cdn/shop/files/9783721201451_5.jpg?v=1757529642) · [Physical spine reference](https://post-architecture-books.com/products/josef-muller-brockmann-grid-systems-in-graphic-design)

`grid-systems-back.webp` reconstructs the photographed back grid on flat orange stock and retains the actual lower imprint and ISBN label. [Photographed Niggli copy, images 6 and 20](https://www.ebay.com/itm/298247028940)

## The Creative Act: A Way of Being

Penguin Press lists Rick Rubin's 2023 US edition, ISBN 9780593652886, as a 432-page cloth-over-board hardcover without a jacket. The modeled 160 × 226 × 36 mm dimensions follow the publisher's rounded metric figures. [Publisher's edition record](https://prhinternationalsales.com/book/?isbn=9780593652886)

`public/books/creative-act.webp` uses the publisher’s front-cover image. On the spine, the original letterforms were isolated from that high-resolution artwork and recomposed to match the stacked title and author on Pentagram’s unfolded production case. Its circular stamp is redrawn at the measured diameter. The black Penguin Press imprint uses Pentagram’s original square and wordmark. All three elements share a centerline on grey cloth, with weave and lighting supplied by the scene. [Publisher’s flat artwork](https://images.penguinrandomhouse.com/cover/tif/9780593652886) · [Designer’s case photographs](https://www.pentagram.com/news/working-with-rick-rubin-on-the-creative-act-a-way-of-being) · [Penguin Press identity](https://www.pentagram.com/work/penguin-press)

`creative-act-back.webp` matches the open ring and rounded ISBN sticker on the US edition. The reconstructed texture combines cloth and ink sampled from the publisher’s front artwork with the rectified sticker from the physical copy. [US back cover photograph](https://www.ebay.com.au/itm/285896504733)
