sessionStorage.setItem('clarityID', 'ncdyolbwc5');
sessionStorage.setItem('googleID', 'G-J9EGREXSYH');
const cID = sessionStorage.getItem('clarityID');
const gID = sessionStorage.getItem('googleID');

window.dataLayer = window.dataLayer || [];

!(function(e, n) {
    'object' == typeof exports && 'undefined' != typeof module ?
        (module.exports = n()) :
        'function' == typeof define && define.amd ?
        define(n) :
        ((e =
            'undefined' != typeof globalThis ?
            globalThis :
            e || self).cookieManager = n());
})(this, function() {
    'use strict';
    var e = (function() {
            function e(e) {
                this.config = e;
            }
            return (
                (e.prototype.getCategoryByCookieName = function(n) {
                    var o;
                    return n === this.config.userPreferences.cookieName ? {
                            name: '__internal',
                            optional: !1,
                            matchBy: 'exact',
                        } :
                        null !==
                        (o = this.getCategories().filter(function(e) {
                            return e.cookies.some(function(o) {
                                switch (e.matchBy) {
                                    case 'exact':
                                        return n === o;
                                    case 'includes':
                                        return n.includes(o);
                                    default:
                                        return n.startsWith(o);
                                }
                            });
                        })[0]) && void 0 !== o ?
                        o : {
                            name: e.DEFAULTS.UNDEFINED_CATEGORY_NAME,
                            optional: !0,
                        };
                }),
                (e.prototype.getCategories = function() {
                    return this.config.cookieManifest.map(function(e) {
                        var n, o;
                        return {
                            name: e.categoryName,
                            cookies: e.cookies,
                            optional: null === (n = e.optional) || void 0 === n || n,
                            matchBy: null !== (o = e.matchBy) && void 0 !== o ? o : 'startsWith',
                        };
                    });
                }),
                (e.DEFAULTS = {
                    UNDEFINED_CATEGORY_NAME: 'un-categorized',
                }),
                e
            );
        })(),
        n = (function() {
            function n(e, n, o) {
                ((this.config = e),
                    (this.manifestHandler = n),
                    (this.userPreferences = o));
            }
            return (
                (n.prototype.processCookies = function() {
                    (this.config.additionalOptions.deleteUndefinedCookies &&
                        this._processUnCategorizedCookies(),
                        this._processNonConsentedCookies());
                }),
                (n.prototype._processNonConsentedCookies = function() {
                    var o = this;
                    (console.debug('Deleting non-consented cookies'),
                        n
                        .getAllCookies()
                        .filter(function(n) {
                            var t = o.manifestHandler.getCategoryByCookieName(n.name);
                            return (
                                t.name !== e.DEFAULTS.UNDEFINED_CATEGORY_NAME &&
                                t.optional &&
                                !o.userPreferences.getPreferences()[t.name]
                            );
                        })
                        .forEach(function(e) {
                            return n.deleteCookie(e);
                        }));
                }),
                (n.prototype._processUnCategorizedCookies = function() {
                    var o = this;
                    (console.debug('Deleting non-categorized cookies'),
                        n
                        .getAllCookies()
                        .filter(function(n) {
                            return (
                                o.manifestHandler.getCategoryByCookieName(n.name).name ===
                                e.DEFAULTS.UNDEFINED_CATEGORY_NAME
                            );
                        })
                        .forEach(function(e) {
                            return n.deleteCookie(e);
                        }));
                }),
                (n.getAllCookies = function() {
                    return decodeURIComponent(document.cookie)
                        .split(';')
                        .map(function(e) {
                            return e.trim();
                        })
                        .filter(function(e) {
                            return e.length;
                        })
                        .map(function(e) {
                            var n = e.split(/=(.*)/).map(function(e) {
                                return e.trim();
                            });
                            return { name: n[0], value: n[1] };
                        });
                }),
                (n.getCookie = function(e) {
                    return n.getAllCookies().filter(function(n) {
                        return n.name === e;
                    })[0];
                }),
                (n.saveCookie = function(e, n, o) {
                    var t = new Date();
                    t.setDate(t.getDate() + n);
                    var r = e.name + '=';
                    ((r +=
                            'object' == typeof e.value ? JSON.stringify(e.value) : e.value),
                        (r += n ? ';expires=' + t.toUTCString() : ''),
                        (r += o ? ';secure' : ''),
                        (r += ';path=/;'),
                        (document.cookie = r),
                        console.debug("Saved '".concat(e.name, "' cookie")));
                }),
                (n.deleteCookie = function(e) {
                    console.debug('Deleting cookie: ' + e.name);
                    var n = window.location.hostname,
                        o = n.substring(n.indexOf('.')),
                        t = new Date(-1).toUTCString();
                    [n, '.' + n, o, '.' + o].forEach(function(n) {
                        document.cookie =
                            e.name + '=;expires=' + t + ';domain=' + n + ';path=/;';
                    });
                }),
                n
            );
        })(),
        o = (function() {
            function e() {}
            return (
                (e.on = function(n, o) {
                    if ('string' == typeof n) {
                        if ('function' == typeof o) {
                            n = n.toLowerCase();
                            var t = Math.random().toString(16).slice(2);
                            return (
                                e._handlerMap.has(n) || e._handlerMap.set(n, new Map()),
                                e._handlerMap.get(n).set(t, o), {
                                    type: n,
                                    token: t,
                                }
                            );
                        }
                        console.error('No callback function provided');
                    } else console.error('Event not provided');
                }),
                (e.off = function(n) {
                    var o, t;
                    try {
                        ((o = n.type.toLowerCase()), (t = n.token));
                    } catch (e) {
                        return void console.error(
                            'Missing or malformed event token provided'
                        );
                    }
                    e._handlerMap.has(o) && e._handlerMap.get(o).delete(t);
                }),
                (e.emit = function(n, o) {
                    ((n = n.toLowerCase()),
                        console.debug('Event fired: ' + n),
                        e._handlerMap.has(n) &&
                        e._handlerMap.get(n).forEach(function(e) {
                            return e(o);
                        }));
                }),
                (e._handlerMap = new Map()),
                e
            );
        })(),
        t = (function() {
            function e(e, n) {
                ((this.config = e), (this.manifestHandler = n));
            }
            return (
                (e.prototype.processPreferences = function() {
                    var e = this.getPreferenceCookie();
                    this.setPreferences(
                        e ?
                        this._loadPreferencesFromCookie() :
                        this._loadPreferenceDefaults()
                    );
                }),
                (e.prototype.getPreferences = function() {
                    return this.preferences ?
                        this.preferences :
                        (console.error(
                            'User preferences not loaded/set, call .processPreferences() first'
                        ), {});
                }),
                (e.prototype.setPreferences = function(e) {
                    (console.debug('Setting preferences to: ' + JSON.stringify(e)),
                        (this.preferences = e),
                        o.emit('UserPreferencesSet', e));
                }),
                (e.prototype.getPreferenceCookie = function() {
                    return n.getCookie(this.config.userPreferences.cookieName);
                }),
                (e.prototype.savePreferencesToCookie = function() {
                    var e = {},
                        t = this.getPreferences();
                    (Object.keys(t).forEach(function(n) {
                            e[n] = t[n] ? 'on' : 'off';
                        }),
                        n.saveCookie({
                                name: this.config.userPreferences.cookieName,
                                value: e,
                            },
                            this.config.userPreferences.cookieExpiry,
                            this.config.userPreferences.cookieSecure
                        ),
                        o.emit('UserPreferencesSaved', e));
                }),
                (e.prototype._loadPreferencesFromCookie = function() {
                    var e,
                        t = this.getPreferenceCookie();
                    try {
                        (console.debug('Loading preferences from cookie'),
                            (e = JSON.parse(t.value)));
                    } catch (e) {
                        return (
                            console.error(
                                'Unable to parse user preference cookie "'.concat(
                                    t.name,
                                    '" as JSON.'
                                )
                            ),
                            n.deleteCookie(t),
                            this._loadPreferenceDefaults()
                        );
                    }
                    if ('object' != typeof e)
                        return (
                            console.debug(
                                'User preferences cookie is malformed, deleting old user preferences cookie.'
                            ),
                            n.deleteCookie(t),
                            this._loadPreferenceDefaults()
                        );
                    if (
                        this.manifestHandler
                        .getCategories()
                        .filter(function(e) {
                            return e.optional;
                        })
                        .some(function(n) {
                            return !Object.keys(e).includes(n.name);
                        })
                    )
                        return (
                            console.debug(
                                'User preferences cookie is missing categories, deleting old user preferences cookie.'
                            ),
                            n.deleteCookie(t),
                            this._loadPreferenceDefaults()
                        );
                    var r = {};
                    return (
                        Object.keys(e).forEach(function(n) {
                            r[n] = 'on' === e[n];
                        }),
                        o.emit('UserPreferencesLoaded', e),
                        r
                    );
                }),
                (e.prototype._loadPreferenceDefaults = function() {
                    var e = this;
                    console.debug('Loading preferences from defaults');
                    var n = {},
                        t = {};
                    return (
                        this.manifestHandler
                        .getCategories()
                        .filter(function(e) {
                            var n;
                            return null === (n = e.optional) || void 0 === n || n;
                        })
                        .forEach(function(o) {
                            ((n[o.name] = e.config.additionalOptions.defaultConsent),
                                (t[o.name] = e.config.additionalOptions.defaultConsent ?
                                    'on' :
                                    'off'));
                        }),
                        o.emit('UserPreferencesLoaded', t),
                        n
                    );
                }),
                e
            );
        })(),
        r = function(e, n) {
            return (
                (r =
                    Object.setPrototypeOf ||
                    ({
                            __proto__: [],
                        }
                        instanceof Array &&
                        function(e, n) {
                            e.__proto__ = n;
                        }) ||
                    function(e, n) {
                        for (var o in n)
                            Object.prototype.hasOwnProperty.call(n, o) && (e[o] = n[o]);
                    }),
                r(e, n)
            );
        },
        i = function() {
            return (
                (i =
                    Object.assign ||
                    function(e) {
                        for (var n, o = 1, t = arguments.length; o < t; o++)
                            for (var r in (n = arguments[o]))
                                Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r]);
                        return e;
                    }),
                i.apply(this, arguments)
            );
        };

    function s(e) {
        var n = 'function' == typeof Symbol && Symbol.iterator,
            o = n && e[n],
            t = 0;
        if (o) return o.call(e);
        if (e && 'number' == typeof e.length)
            return {
                next: function() {
                    return (
                        e && t >= e.length && (e = void 0), {
                            value: e && e[t++],
                            done: !e,
                        }
                    );
                },
            };
        throw new TypeError(
            n ? 'Object is not iterable.' : 'Symbol.iterator is not defined.'
        );
    }
    var a = (function() {
            function e(e, n, o) {
                ((this.config = e),
                    (this.userPreferencesHandler = n),
                    (this.cookieHandler = o));
            }
            return (
                (e.prototype.init = function() {
                    var e = this;
                    if (!this.userPreferencesHandler.getPreferenceCookie())
                        return 'loading' === document.readyState ?
                            (console.debug(
                                    'DOM is not ready; adding event to bind to banner when ready.'
                                ),
                                void document.addEventListener('DOMContentLoaded', function() {
                                    return e.init();
                                })) :
                            void(
                                this._getBannerNode() &&
                                ((document.getElementsByClassName(
                                            this.config.preferencesForm.class
                                        )[0] &&
                                        !this.config.cookieBanner.showWithPreferencesForm) ||
                                    (this._setupEventListeners(),
                                        (this._getBannerNode().hidden = !1),
                                        o.emit('CookieBannerInitialized')))
                            );
                }),
                (e.prototype._setupEventListeners = function() {
                    var e = this;
                    (this.config.cookieBanner.actions || []).forEach(function(n) {
                        var o, t;
                        try {
                            for (
                                var r = s(
                                        e._getBannerNode().querySelectorAll('.' + n.buttonClass)
                                    ),
                                    i = r.next(); !i.done; i = r.next()
                            )
                                i.value.addEventListener('click', function(o) {
                                    e._clickEventHandler(
                                        o,
                                        n.name,
                                        n.confirmationClass,
                                        n.consent
                                    );
                                });
                        } catch (e) {
                            o = {
                                error: e,
                            };
                        } finally {
                            try {
                                i && !i.done && (t = r.return) && t.call(r);
                            } finally {
                                if (o) throw o.error;
                            }
                        }
                    });
                }),
                (e.prototype._clickEventHandler = function(e, n, t, r) {
                    var i, a;
                    if ((e.preventDefault(), o.emit('CookieBannerAction', n), t))
                        try {
                            for (
                                var c = s(this._getBannerNode().children), f = c.next(); !f.done; f = c.next()
                            ) {
                                var u = f.value;
                                u.hidden = !u.classList.contains(t);
                            }
                        } catch (e) {
                            i = {
                                error: e,
                            };
                        } finally {
                            try {
                                f && !f.done && (a = c.return) && a.call(c);
                            } finally {
                                if (i) throw i.error;
                            }
                        }
                    else this._getBannerNode().hidden = !0;
                    if (void 0 !== r) {
                        var l = this.userPreferencesHandler.getPreferences();
                        ('boolean' == typeof r &&
                            Object.keys(l).forEach(function(e) {
                                l[e] = r;
                            }),
                            Array.isArray(r) &&
                            r.forEach(function(e) {
                                l[e] = !0;
                            }),
                            this._updatePreferences(l));
                    }
                }),
                (e.prototype._updatePreferences = function(e) {
                    (this.userPreferencesHandler.setPreferences(e),
                        this.userPreferencesHandler.savePreferencesToCookie(),
                        this.cookieHandler.processCookies());
                }),
                (e.prototype._getBannerNode = function() {
                    return document.querySelector('.' + this.config.cookieBanner.class);
                }),
                e
            );
        })(),
        c = (function() {
            function e(e, n, o) {
                ((this.config = e),
                    (this.userPreferencesHandler = n),
                    (this.cookieHandler = o));
            }
            return (
                (e.prototype.init = function() {
                    var e = this;
                    if ('loading' === document.readyState)
                        return (
                            console.debug(
                                'DOM is not ready; adding event to bind to preference form when ready.'
                            ),
                            void document.addEventListener('DOMContentLoaded', function() {
                                return e.init();
                            })
                        );
                    this._getPreferencesForm() &&
                        (this._setupEventListeners(),
                            this._configureFormRadios(),
                            o.emit('PreferenceFormInitialized'));
                }),
                (e.prototype._getPreferencesForm = function() {
                    return document.getElementsByClassName(
                        this.config.preferencesForm.class
                    )[0];
                }),
                (e.prototype._setupEventListeners = function() {
                    var e = this;
                    this._getPreferencesForm().addEventListener('submit', function(n) {
                        return e._submitEventHandler(n);
                    });
                }),
                (e.prototype._submitEventHandler = function(e) {
                    var n, t;
                    e.preventDefault();
                    var r = {};
                    try {
                        for (
                            var i = s(
                                    e.target.querySelectorAll('input[type="radio"]:checked')
                                ),
                                a = i.next(); !a.done; a = i.next()
                        ) {
                            var c = a.value,
                                f = c.getAttribute('name'),
                                u = c.getAttribute('value');
                            r[f] = 'on' === u;
                        }
                    } catch (e) {
                        n = {
                            error: e,
                        };
                    } finally {
                        try {
                            a && !a.done && (t = i.return) && t.call(i);
                        } finally {
                            if (n) throw n.error;
                        }
                    }
                    (o.emit('PreferenceFormSubmitted', r), this._updatePreferences(r));
                }),
                (e.prototype._updatePreferences = function(e) {
                    (this.userPreferencesHandler.setPreferences(e),
                        this.userPreferencesHandler.savePreferencesToCookie(),
                        this.cookieHandler.processCookies());
                }),
                (e.prototype._configureFormRadios = function() {
                    var e = this.userPreferencesHandler.getPreferences();
                    for (var n in e) {
                        var o = e[n] ? 'on' : 'off',
                            t = this._getPreferencesForm().querySelector(
                                'input[name='.concat(n, '][value=').concat(o, ']')
                            );
                        t && (t.checked = !0);
                    }
                }),
                e
            );
        })(),
        f = function(e) {
            return 'string' == typeof e && '' !== e.trim();
        },
        u = function(e) {
            return 'boolean' == typeof e;
        },
        l = function(e) {
            return 'number' == typeof e && !isNaN(e);
        },
        d = function(e) {
            return void 0 === e;
        },
        p = function(e, n) {
            return (
                (function(e) {
                    return Array.isArray(e) && e.length;
                })(e) &&
                e.every(function(e) {
                    return n(e);
                })
            );
        },
        h = (function() {
            function e() {
                this.configTypes = {
                    userPreferences: {
                        cookieName: f,
                        cookieExpiry: l,
                        cookieSecure: u,
                    },
                    preferencesForm: {
                        class: f,
                    },
                    cookieBanner: {
                        class: f,
                        showWithPreferencesForm: u,
                        actions: {
                            name: f,
                            buttonClass: f,
                            confirmationClass: {
                                OR: [d, f],
                            },
                            consent: {
                                OR: [
                                    d,
                                    u,
                                    function(e) {
                                        return p(e, f);
                                    },
                                ],
                            },
                        },
                    },
                    additionalOptions: {
                        disableCookieBanner: u,
                        disableCookiePreferencesForm: u,
                        deleteUndefinedCookies: u,
                        defaultConsent: u,
                    },
                    cookieManifest: {
                        categoryName: f,
                        optional: {
                            OR: [d, u],
                        },
                        matchBy: {
                            OR: [
                                d,
                                function(e) {
                                    return (
                                        f(e) &&
                                        -1 !== ['exact', 'startsWith', 'includes'].indexOf(e)
                                    );
                                },
                            ],
                        },
                        cookies: function(e) {
                            return p(e, f);
                        },
                    },
                };
            }
            return (
                (e.prototype.typeOfTester = function(e, n) {
                    return 'function' == typeof n ?
                        n(e) :
                        n.AND ?
                        n.AND.every(function(n) {
                            return n(e);
                        }) :
                        n.OR.some(function(n) {
                            return n(e);
                        });
                }),
                (e.prototype.validateUserPreferencesConfig = function(e) {
                    for (var n in this.configTypes.userPreferences)
                        if (!this.typeOfTester(e[n], this.configTypes.userPreferences[n]))
                            throw new g(n);
                }),
                (e.prototype.validateAdditionalOptionsConfig = function(e) {
                    for (var n in this.configTypes.additionalOptions)
                        if (!this.typeOfTester(e[n], this.configTypes.additionalOptions[n]))
                            throw new g(n);
                }),
                (e.prototype.validatePreferencesFormConfig = function(e) {
                    for (var n in this.configTypes.preferencesForm)
                        if (!this.typeOfTester(e[n], this.configTypes.preferencesForm[n]))
                            throw new g(n);
                }),
                (e.prototype.validateCookieBannerConfig = function(e) {
                    var n = this,
                        o = this.configTypes.cookieBanner,
                        t = o.actions,
                        r = (function(e, n) {
                            var o = {};
                            for (var t in e)
                                Object.prototype.hasOwnProperty.call(e, t) &&
                                n.indexOf(t) < 0 &&
                                (o[t] = e[t]);
                            if (
                                null != e &&
                                'function' == typeof Object.getOwnPropertySymbols
                            ) {
                                var r = 0;
                                for (t = Object.getOwnPropertySymbols(e); r < t.length; r++)
                                    n.indexOf(t[r]) < 0 &&
                                    Object.prototype.propertyIsEnumerable.call(e, t[r]) &&
                                    (o[t[r]] = e[t[r]]);
                            }
                            return o;
                        })(o, ['actions']);
                    for (var i in r)
                        if (!this.typeOfTester(e[i], this.configTypes.cookieBanner[i]))
                            throw new g(i);
                    e.actions.forEach(function(e) {
                        for (var o in t)
                            if (!n.typeOfTester(e[o], n.configTypes.cookieBanner.actions[o]))
                                throw new g(o);
                    });
                }),
                (e.prototype.validateCookieManifestConfig = function(e) {
                    var n = this;
                    e.forEach(function(e) {
                        for (var o in n.configTypes.cookieManifest)
                            if (!n.typeOfTester(e[o], n.configTypes.cookieManifest[o]))
                                throw new g(o);
                    });
                }),
                (e.prototype.validateConfig = function(e) {
                    (this.validateUserPreferencesConfig(e.userPreferences),
                        this.validateAdditionalOptionsConfig(e.additionalOptions),
                        this.validatePreferencesFormConfig(e.preferencesForm),
                        this.validateCookieBannerConfig(e.cookieBanner),
                        this.validateCookieManifestConfig(e.cookieManifest));
                }),
                (e.prototype.mergeConfigurations = function(n) {
                    var o,
                        t = i({}, e.defaultConfig);
                    return (
                        Object.keys(n).length &&
                        ((t.userPreferences = i(
                                i({}, e.defaultConfig.userPreferences),
                                n.userPreferences
                            )),
                            (t.additionalOptions = i(
                                i({}, e.defaultConfig.additionalOptions),
                                n.additionalOptions
                            )),
                            (t.preferencesForm = i(
                                i({}, e.defaultConfig.preferencesForm),
                                n.preferencesForm
                            )),
                            (t.cookieBanner = i(
                                i({}, e.defaultConfig.cookieBanner),
                                n.cookieBanner
                            )),
                            (t.cookieManifest =
                                null !== (o = n.cookieManifest) && void 0 !== o ?
                                o :
                                e.defaultConfig.cookieManifest),
                            this.validateConfig(t)),
                        t
                    );
                }),
                (e.defaultConfig = {
                    userPreferences: {
                        cookieName: 'cookie-preferences',
                        cookieExpiry: 365,
                        cookieSecure: !1,
                    },
                    preferencesForm: {
                        class: 'cookie-preferences-form',
                    },
                    cookieBanner: {
                        class: 'cookie-banner',
                        showWithPreferencesForm: !1,
                        actions: [{
                                name: 'accept',
                                buttonClass: 'cookie-banner-accept-button',
                                confirmationClass: 'cookie-banner-accept-message',
                                consent: !0,
                            },
                            {
                                name: 'reject',
                                buttonClass: 'cookie-banner-reject-button',
                                confirmationClass: 'cookie-banner-reject-message',
                                consent: !1,
                            },
                            {
                                name: 'hide',
                                buttonClass: 'cookie-banner-hide-button',
                            },
                        ],
                    },
                    cookieManifest: [],
                    additionalOptions: {
                        disableCookieBanner: !1,
                        disableCookiePreferencesForm: !1,
                        deleteUndefinedCookies: !0,
                        defaultConsent: !1,
                    },
                }),
                e
            );
        })(),
        g = (function(e) {
            function n(n) {
                var o =
                    e.call(
                        this,
                        "Configuration property '".concat(
                            n,
                            "' is malformed, missing or has an unexpected value."
                        )
                    ) || this;
                return ((o.name = 'ConfigError'), o);
            }
            return (
                (function(e, n) {
                    if ('function' != typeof n && null !== n)
                        throw new TypeError(
                            'Class extends value ' +
                            String(n) +
                            ' is not a constructor or null'
                        );

                    function o() {
                        this.constructor = e;
                    }
                    (r(e, n),
                        (e.prototype =
                            null === n ?
                            Object.create(n) :
                            ((o.prototype = n.prototype), new o())));
                })(n, e),
                n
            );
        })(Error);
    return {
        on: o.on,
        off: o.off,
        init: function(r) {
            var i;
            console.debug('CookieManager initializing...');
            try {
                i = new h().mergeConfigurations(r);
            } catch (e) {
                return (
                    console.error(e),
                    void console.error(
                        'Invalid config supplied to CookieManager, disabling...'
                    )
                );
            }
            var s = new e(i),
                f = new t(i, s),
                u = new n(i, s, f);
            (f.processPreferences(),
                i.additionalOptions.disableCookieBanner || new a(i, f, u).init(),
                i.additionalOptions.disableCookiePreferencesForm ||
                new c(i, f, u).init(),
                o.emit('CookieManagerLoaded'),
                u.processCookies());
        },
    };
});

const getCookieValue = name => {
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return match ? match.pop() : '';
};

// Google Analytics
function gtag() {
    window.dataLayer = window.dataLayer || [];

    function gtag() {
        dataLayer.push(arguments);
    }
    gtag('js', new Date());

    gtag('config', 'G-J9EGREXSYH');
}

// MS Clarity
function ctag(c, l, a, r, i, t, y) {
    c[a] =
        c[a] ||
        function() {
            (c[a].q = c[a].q || []).push(arguments);
        };
    t = l.createElement(r);
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
}

// Send analytics
function sendAnalytics() {
    gtag('js', new Date());
    gtag('config', gID);
    ctag(window, document, 'clarity', 'script', cID);
}

// Cookie manager
var config = {
    userPreferences: {
        cookieName: 'cookie-preferences',
        cookieExpiry: 365,
        cookieSecure: false,
    },
    preferencesForm: {
        class: 'cookie-preferences-form',
    },
    cookieBanner: {
        class: 'js-cookie-banner',
        showWithPreferencesForm: false,
        actions: [{
                name: 'accept',
                buttonClass: 'js-cookie-banner-accept',
                confirmationClass: 'js-cookie-banner-confirmation-accept',
                consent: true,
            },
            {
                name: 'reject',
                buttonClass: 'js-cookie-banner-reject',
                confirmationClass: 'js-cookie-banner-confirmation-reject',
                consent: false,
            },
            {
                name: 'hide',
                buttonClass: 'js-cookie-banner-hide',
            },
        ],
    },
    cookieManifest: [{
        categoryName: 'analytics',
        optional: true,
        cookies: ['analytics', '_ga', '_gid', '_clsk', '_clck'],
    }, ],
    additionalOptions: {
        defaultConsent: false,
        deleteUndefinedCookies: false,
        disableCookieBanner: false,
        disableCookiePreferencesForm: false,
    },
};

// Callback to reload page on cookie form submission
const reloadCallback = function(eventData) {
    var successBanner = document.querySelector(
        '.govuk-notification-banner--success'
    );

    window.scrollTo({ top: 0, behavior: 'smooth' });

    successBanner.removeAttribute('hidden');
    successBanner.focus();
};

// Callback to trigger sending analytics if the analytics preference has been accepted in the cookie banner
const triggerAnalyticsCallback = function(eventData) {
    if (eventData == 'accept') {
        sendAnalytics();
    }
};

// Initialise the cookie manager
window.cookieManager.on('PreferenceFormSubmitted', reloadCallback);
window.cookieManager.on('CookieBannerAction', triggerAnalyticsCallback);
window.cookieManager.init(config);

// Send analytics if the cookie is set
try {
    const result =
        JSON.parse(getCookieValue('cookie-preferences')).analytics == 'on';

    // Cookie has been set
    if (result == true) {
        sendAnalytics();
    }
} catch (err) {
    // SyntaxError: Unexpected end of JSON input
    // console.log('error', err);
}