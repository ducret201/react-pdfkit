import {applyDocProperties, revertDocProperties} from '../adapters/adapter'
import {BEFORE_PAGEBREAK_FILTER, AFTER_PAGEBREAK_FILTER, preventPageBreak, computeMargins, computeGravity, computeWidth, computeHeight, computeScale, computeRotate} from './layout'

export default function(element, context, next) {
    const {children, x, y, width, height, gravity, margin, margins, pageBreak, ...props} = element.props
    const {doc, layout, breakPage} = context

    const computedMargins = computeMargins(margin, margins)

    // init
    var position
    var innerHeight
    var snapshot

    function computeInnerHeight(height) {
        const newInnerHeight = doc.y + height - position.y - computedMargins.top
        return newInnerHeight > innerHeight && newInnerHeight || innerHeight
    }

    function nextLayout({x = 0, y = 0, width, height, gravity, scale, rotate}) {
        const computedScale = computeScale(position, computedMargins, undefined, width, scale)
        const computedWidth = computeWidth(position, computedMargins, undefined, width, computedScale)
        const computedHeight = computeHeight(innerHeight, height, computedWidth, computedScale)
        const computedGravity = computeGravity(position, computedMargins, innerHeight, undefined, gravity, computedWidth, computedHeight)
        const computedRotate = computeRotate(rotate)

        return {
            x: doc.x = position.x + computedMargins.left + computedGravity.left + x,
            y: doc.y = position.y + computedMargins.top + computedGravity.top + y,
            width: computedWidth,
            height: computedHeight,
            scale: computedScale,
            rotate: computedRotate,
            after: function() {
                innerHeight = computeInnerHeight(this.height)
                doc.x = position.x + computedMargins.left
                doc.y = position.y + computedMargins.top
            }
        }
    }

    function nextBreakPage(pos, beforePageBreak, afterPageBreak) {
        return breakPage(pos, () => {
            beforePageBreak()
            next({layout: nextLayout, breakPage: () => false}, BEFORE_PAGEBREAK_FILTER)
            after()
        }, () => {
            before()
            next({layout: nextLayout, breakPage: () => false}, AFTER_PAGEBREAK_FILTER)
            afterPageBreak()
        })
    }

    function nextLayoutWithPageBreak(option) {
        var position = nextLayout(option)
        
        if (!preventPageBreak(pageBreak) && nextBreakPage(position, () => {}, () => {})) {
            position = nextLayout(option)
        }
        return position
    }

    function before() {
        position = layout({x, y, width, height, gravity})
        innerHeight = position.height - computedMargins.top - computedMargins.bottom

        doc.x = position.x + computedMargins.left
        doc.y = position.y + computedMargins.top

        doc.save()
        snapshot = applyDocProperties(doc, props)
    }

    function after() {
        revertDocProperties(doc, snapshot)
        doc.restore()

        doc.x = position.x
        doc.y = !position.height && (position.y + innerHeight + computedMargins.top + computedMargins.bottom) || position.y
        position.after()
    }

    before()
    next({layout: nextLayoutWithPageBreak, breakPage: nextBreakPage})
    after()
}
