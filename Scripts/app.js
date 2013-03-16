/// <reference path="jquery-1.9.1.js" />

// Class to represent a news item
var newsItem = function (url, title, details, imageUrl, time, columnSize) {
    var _this = this;

    _this.url = url;
    _this.title = title;
    _this.imageUrl = imageUrl;
    _this.time = new Date(time);
    _this.localTime = _this.time.toLocaleString();
    _this.columnSize = columnSize;

    // Truncate the details if they're too long
    if (details.length < 250) {
        _this.details = details;
    } else {
        _this.details = details.substring(0, 246) + " ...";
    }

    _this.clicked = function () {
        window.location.href = _this.url;
    };
};

// Class to represent a news source
var source = function (name, url, mappingFunction, defaultIds) {
    var _this = this;

    _this.name = name;
    _this.url = url;
    _this.mappingFunction = mappingFunction;
    _this.defaultIds = defaultIds;
    _this.ids = ko.observableArray();
    _this.idToAdd = ko.observable("");

    _this.addId = function () {
        if ($.inArray(_this.idToAdd(), _this.ids()) == -1) {
            _this.ids.push(_this.idToAdd());
            _this.idToAdd("");
        }
    }

    _this.removeId = function (id) {
        _this.ids.remove(id);
    }
}

var config = function () {
    var _this = this;

    _this.title = ko.observable("");

    _this.sources = [
        new source(
            "YouTube",
            "http://gdata.youtube.com/feeds/api/users/{id}/uploads?v=2&alt=jsonc",
            function (data, newsItems) {
                $.each(data.data.items, function (key, value) {
                    newsItems.push(new newsItem(
                        value.player.default,
                        value.title,
                        value.description,
                        value.thumbnail.hqDefault,
                        value.uploaded,
                        "480px"));
                });
            },
            ["ninja000"]),
        new source(
            "Twitter",
            "https://api.twitter.com/1/statuses/user_timeline.json?screen_name={id}&include_rts=true&count=40&callback=?",
            function (data, newsItems) {
                $.each(data, function (key, value) {
                    var createdAt = value.created_at;

                    // IE can't handle twitter's date format, so we hack it up a bit
                    // this probably doesn't take into account international time offfsets TODO: Fix
                    if (new Date(createdAt) == "Invalid Date") {
                        createdAt = createdAt.replace(/\+\d{4}\s/, "");
                    }
                    newsItems.push(new newsItem(
                        "http://twitter.com/", // TODO: Have a sensible url
                        "",
                        value.text,
                        value.user.profile_image_url,
                        createdAt,
                        "160px"));
                });
            },
            ["ninjatunehq"]),
        new source(
            "SoundCloud",
            "https://api.soundcloud.com/users/{id}/tracks.json?client_id=0f09d82872276292dad27414f7d88531",
            function (data, newsItems) {
                $.each(data, function (key, value) {
                    newsItems.push(new newsItem(
                        value.permalink_url,
                        value.title,
                        value.description,
                        value.artwork_url,
                        value.created_at,
                        "320px"));
                });
            },
            ["ninja-tune"])
    ];

    _this.save = function () {
        // Save the title
        localStorage.setItem("title", _this.title());

        // Save the ids for each  source
        _this.sources.forEach(function (sourceItem) {
            localStorage.setItem(sourceItem.name, JSON.stringify(sourceItem.ids()));
        });
    };

    _this.load = function () {
        // Load the title
        _this.title(localStorage.getItem("title"));

        // Load the ids for each source
        _this.sources.forEach(function (sourceItem) {
            var item = localStorage.getItem(sourceItem.name);

            if (item !== null && item != "undefined") {
                sourceItem.ids = ko.observableArray(JSON.parse(item));
            }
        });
    }
}

// Overall viewmodel for this screen, along with initial state
function appViewModel() {
    var _this = this;
    var $container = $('#container');

    _this.newsItems = ko.observableArray();
    _this.pendingCallbacks = 0;
    _this.config = new config();

    _this.callbackComplete = function () {
        console.log("Pending callbacks:" + _this.pendingCallbacks);
        _this.pendingCallbacks--;
        // If all the callbacks are complete
        if (_this.pendingCallbacks == 0) {
            // Sort the news items
            _this.newsItems.sort(function (item1, item2) {
                return item1.time < item2.time ? 1 : item1.time > item2.time ? -1 : 0;
            });

            // Apply Masonry (waiting until images have been loaded)
            $container.imagesLoaded(function () {
                console.log("Calling masonry");
                $container.masonry({
                    itemSelector: '.item',
                    columnWidth: 160,
                    gutterWidth: 20,
                    isFitWidth: true
                });
            });
        }
    };

    _this.saveConfig = function () {
        _this.config.save();
        $("#sources").slideUp();
        $container.masonry('destroy');
        _this.init();
    };

    _this.editConfig = function () {
        $("#sources").slideDown();
    };

    _this.init = function () {
        _this.newsItems([]);
        _this.pendingCallbacks = 0;

        _this.config.load();

        if (_this.config.title() == "null") {
            // There's nothing in local storage so use the defaults
            _this.config.sources.forEach(function (newsSource) {
                newsSource.ids(newsSource.defaultIds);
            });
            _this.config.title("Using default sources, click edit to change them and this title ... ");
        }

        // Loop through each of the sources
        _this.config.sources.forEach(function (newsSource) {
            // Loop through each id of a source
            newsSource.ids().forEach(function (id) {
                _this.pendingCallbacks++;
                var url = newsSource.url.replace(/\{id\}/, id);
                $.getJSON(url, function (data) {
                    newsSource.mappingFunction(data, _this.newsItems);
                    _this.callbackComplete();
                });
            });
        });
    };
}
