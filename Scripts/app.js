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


var source = function (name, url, mappingFunction, width, ids) {
    var _this = this;

    _this.name = name;
    _this.url = url;
    _this.mappingFunction = mappingFunction;
    _this.width = width;
    _this.ids = ko.observableArray(ids);
}


// Class to represent sources
var sources = function () {
    var _this = this;

    _this.twitterIds;
    _this.youTubeIds;
    _this.soundCloudIds;
        
    _this.getArrayFromStorage = function (id) {
        var item = localStorage.getItem(id);

        if (item === null || item == "undefined") {
            return [];
        } else {
            return JSON.parse(item);
        }
    }

    _this.init = function () {
        _this.twitterIds = ko.observableArray(_this.getArrayFromStorage("twitterIds"));
        _this.youTubeIds = ko.observableArray(_this.getArrayFromStorage("youTubeIds"));
        _this.soundCloudIds = ko.observableArray(_this.getArrayFromStorage("soundCloudIds"));

        // If there aren't any sources then show a welcome message and set some defaults
        if (_this.twitterIds().length == 0 && _this.youTubeIds().length == 0 && _this.soundCloudIds().length == 0) {
            alert("Looks like you haven't set up any sources, don't worry I've added Ninja Tune as a default, click edit if you want to change your sources");

            _this.twitterIds.push("ninjatunehq");
            _this.youTubeIds.push("ninja000");
            _this.soundCloudIds.push("ninja-tune");
        }
    }

    _this.save = function () {
        localStorage.setItem("twitterIds", JSON.stringify(_this.twitterIds()));
        localStorage.setItem("youTubeIds", JSON.stringify(_this.youTubeIds()));
        localStorage.setItem("soundCloudIds", JSON.stringify(_this.soundCloudIds()));

        $("#sources").slideUp();
    }

    _this.show = function () {
        $("#sources").slideDown();
    }

    _this.addTwitter = function () {
        _this.twitterIds.push("");
    };

    _this.removeTwitter = function (twitter) {
        _this.twitterIds.remove(twitter);
    };

    _this.addYouTube = function () {
        _this.youTubeIds.push("");
    }

    _this.removeYouTube = function (youTube) {
        _this.youTubeIds.remove(youTube);
    }

    _this.addSoundCloud = function () {
        _this.soundCloudIds.push("");
    }

    _this.removeSoundCloud = function (soundCloud) {
        _this.soundCloudIds.remove(soundCloud);
    }
};

// Overall viewmodel for this screen, along with initial state
function appViewModel() {
    var _this = this;

    _this.sources = new sources();
    _this.sources.init();

    _this.pendingCallbacks = 0;

    _this.newsItems = ko.observableArray([]);

    _this.sources.twitterIds().forEach(function (id) {
        _this.pendingCallbacks++;

        $.getJSON("https://api.twitter.com/1/statuses/user_timeline.json?screen_name=" + id + "&include_rts=true&count=40&callback=?", function (data) {
            $.each(data, function (key, value) {
                var createdAt = value.created_at;

                // IE can't handle twitter's date format, so we hack it up a bit
                // this probably doesn't take into account international time offfsets TODO: Fix
                if (new Date(createdAt) == "Invalid Date") {
                    createdAt = createdAt.replace(/\+\d{4}\s/, "");
                }
                _this.newsItems.push(new newsItem(
                    "http://twitter.com/" + id,
                    "",
                    value.text,
                    value.user.profile_image_url,
                    createdAt,
                    "160px"));
            });
            _this.callbackComplete();
        });
    });

    _this.sources.youTubeIds().forEach(function (id) {
        _this.pendingCallbacks++;

        $.getJSON("http://gdata.youtube.com/feeds/api/users/" + id + "/uploads?v=2&alt=jsonc", function (data) {
            $.each(data.data.items, function (key, value) {
                _this.newsItems.push(new newsItem(
                    value.player.default,
                    value.title,
                    value.description,
                    value.thumbnail.hqDefault,
                    value.uploaded,
                    "480px"));
            });
            _this.callbackComplete();
        });
    });

    _this.sources.soundCloudIds().forEach(function (id) {
        _this.pendingCallbacks++;

        $.getJSON("https://api.soundcloud.com/users/" + id + "/tracks.json?client_id=0f09d82872276292dad27414f7d88531", function (data) {
            $.each(data, function (key, value) {
                _this.newsItems.push(new newsItem(
                    value.permalink_url,
                    value.title,
                    value.description,
                    value.artwork_url,
                    value.created_at,
                    "320px"));
            });
            _this.callbackComplete();
        });
    });

    _this.callbackComplete = function () {
        _this.pendingCallbacks--;

        // If all the callbacks are complete
        if (_this.pendingCallbacks == 0) {
            // Sort the news items
            _this.newsItems.sort(function (item1, item2) {
                return item1.time < item2.time ? 1 : item1.time > item2.time ? -1 : 0;
            });

            // Apply Masonry (waiting until images have been loaded)
            var $container = $('#container');
            $container.imagesLoaded(function () {
                $container.masonry({
                    itemSelector: '.item',
                    columnWidth: 160,
                    gutterWidth: 10
                });
            });
        }
    };
};