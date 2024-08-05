module.exports = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Ensure <a> tags with href starting with http (external links) have rel=\"noopener noreferrer\"",
            category: "Best Practices",
            recommended: true,
        },
        schema: [],
    },
    /**
     * Creates a ESLint rule object for detecting <a> tags with href starting with "http" (external links) that do not have rel="noopener noreferrer".
     * 
     * @param {Object} context - The ESLint rule context object.
     * @returns {Object} The ESLint rule object.
     */
    create(context) {
        return {
            JSXOpeningElement(node) {
                if (node.name.name === 'a') {
                    const hrefAttribute = node.attributes.find(attr => attr.name && attr.name.name === 'href');
                    if (hrefAttribute && hrefAttribute.value.value.startsWith('http')) {
                        const relAttribute = node.attributes.find(attr => attr.name && attr.name.name === 'rel');
                        if (!relAttribute || !/noopener\s*noreferrer/.test(relAttribute.value.value)) {
                            context.report({
                                node,
                                message: '<a> tag with href starting with "http" (external links) should have rel="noopener noreferrer".',
                            });
                        }
                    }
                }
            }
        };
    }
};