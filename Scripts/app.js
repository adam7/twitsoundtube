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

// Overall viewmodel for this screen, along with initial state
function appViewModel() {
    var _this = this;

    // Specify user ids to be queried
    _this.twitterIds = ["ninjatunehq"];
    _this.youTubeIds = ["ninja000"];
    _this.soundCloudIds = ["ninja-tune"];

    _this.pendingCallbacks = 0;

    _this.newsItems = ko.observableArray([]);

    _this.twitterIds.forEach(function (id) {
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

    _this.youTubeIds.forEach(function (id) {
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

    _this.soundCloudIds.forEach(function (id) {
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