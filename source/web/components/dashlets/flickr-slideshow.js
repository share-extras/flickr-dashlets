/**
 * Flickr slideshow dashlet.
 * 
 * @namespace Alfresco
 * @class Alfresco.dashlet.FlickrSlideshow
 * @author Will Abson
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event;

   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $combine = Alfresco.util.combinePaths;

   /**
    * Flickr API methods - see http://www.flickr.com/services/api/ for full list
    */
   var METHOD_GET_PUBLIC_PHOTOS = "flickr.people.getPublicPhotos",
      METHOD_GET_CONTACTS_PUBLIC_PHOTOS = "flickr.photos.getContactsPublicPhotos",
      METHOD_GET_FAVORITES_PUBLIC_PHOTOS = "flickr.favorites.getPublicList",
      METHOD_FIND_BY_USERNAME = "flickr.people.findByUsername",
      METHOD_FIND_BY_EMAIL= "flickr.people.findByEmail",
      METHOD_PEOPLE_GET_INFO = "flickr.people.getInfo";

   /**
    * Dashboard FlickrSlideshow constructor.
    * 
    * @param {String} htmlId The HTML id of the parent element
    * @return {Alfresco.dashlet.FlickrSlideshow} The new component instance
    * @constructor
    */
   Alfresco.dashlet.FlickrSlideshow = function FlickrSlideshow_constructor(htmlId)
   {
      return Alfresco.dashlet.FlickrSlideshow.superclass.constructor.call(this, "Alfresco.dashlet.FlickrSlideshow", htmlId, [ "animation", "paginator", "carousel" ]);
   };

   /**
    * Extend from Alfresco.component.Base and add class implementation
    */
   YAHOO.extend(Alfresco.dashlet.FlickrSlideshow, Alfresco.component.Base,
   {
      /**
       * Object container for initialization options
       *
       * @property options
       * @type object
       */
      options:
      {
         /**
          * The component id, used to persist dashlet configuration.
          *
          * @property componentId
          * @type string
          * @default ""
          */
         componentId: "",

         /**
          * Flickr user ID (not the same as user name!)
          * 
          * @property userId
          * @type string
          * @default ""
          */
         userId: "",

         /**
          * Number of photos to display
          * 
          * @property numPhotos
          * @type int
          * @default 20
          */
         numPhotos: 50,

         /**
          * Flickr API key
          * 
          * @property apiKey
          * @type string
          * @default ""
          */
         apiKey: "",

         /**
          * Type of stream to load, either "user", "favorites" or "contacts". Option userId must also be set.
          * 
          * @property streamType
          * @type string
          * @default "user"
          */
         streamType: "user",

         /**
          * Time in milliseconds between photos. Set to zero to disable auto
          * transitions (users can still click to advance the photo)
          * 
          * @property slideshowPeriod
          * @type int
          * @default 5000
          */
         slideshowPeriod: 5000,

         /**
          * Whether the carousel at the bottom of the dashlet should be shown
          * 
          * @property carouselEnabled
          * @type boolean
          * @default true
          */
         carouselEnabled: true
      },

      /**
       * Body DOM container.
       * 
       * @property bodyContainer
       * @type HTMLElement
       * @default null
       */
      bodyContainer: null,

      /**
       * Photos DOM container.
       * 
       * @property photosContainer
       * @type HTMLElement
       * @default null
       */
      photosContainer: null,

      /**
       * User message DOM container.
       * 
       * @property messageContainer
       * @type HTMLElement
       * @default null
       */
      messageContainer: null,

      /**
       * Dashlet title DOM container.
       * 
       * @property titleContainer
       * @type HTMLElement
       * @default null
       */
      titleContainer: null,
      
      /**
       * Photo overlay DOM container
       * @type HTMLElement
       * @default null
       */
      overlayContainer: null,
      
      /**
       * Photo title DOM container
       * @type HTMLElement
       * @default null
       */
      overlayTitleContainer: null,

      /**
       * Photo objects loaded via JSON.
       * 
       * @property photos
       * @type Array
       * @default null
       */
      photos: null,

      /**
       * Position within the slide show.
       * 
       * @property slideshowPos
       * @type int
       * @default 0
       */
      slideshowPos: 0,

      /**
       * Flickr user details - not the same as user ID
       * 
       * @property userDetails
       * @type object
       * @default null
       */
      userDetails: null,

      /**
       * Timer used to cycle through the photos
       * 
       * @property timer
       * @type object
       * @default null
       */
      timer: null,

      /**
       * Fired by YUI when parent element is available for scripting
       * 
       * @method onReady
       */
      onReady: function FlickrSlideshow_onReady()
      {
         Event.addListener(this.id + "-configure-link", "click", this.onConfigClick, this, true);
         
         // The body container
         this.bodyContainer = Dom.get(this.id + "-body");
         
         // The photos container
         this.photosContainer = Dom.get(this.id + "-photos");
         
         // The message container
         this.messageContainer = Dom.get(this.id + "-message");
         
         // The dashlet title container
         this.titleContainer = Dom.get(this.id + "-title");
         
         // Photo overlay and photo title containers
         this.overlayContainer = Dom.get(this.id + "-overlay");
         this.overlayTitleContainer = Dom.get(this.id + "-overlay-title");
         
         // Carousel element
         this.widgets.carouselEl = Dom.get(this.id + "-carousel");
         
         // Position overlay at the top of the dashlet body
         this._overlayElement(this.overlayContainer, this.bodyContainer, false, true, false);
         Event.addListener(this.overlayContainer, "mouseover", this.onPhotoMouseover, null, this);
         Event.addListener(this.overlayContainer, "mouseout", this.onPhotoMouseout, null, this);
         
         // Initialise the dashlet when all the other dashlets have loaded
         Event.onContentReady("bd", this.onContainerReady, null, this);
      },

      /**
       * Initialise the dashlet. We defer doing this because in order to load photos we need to know the final
       * dimensions of the dashlet body, after all the other dashboard columns have loaded.
       *
       * @method onContainerReady
       * @param e {object} HTML event
       */
      onContainerReady: function FlickrSlideshow_onContainerReady(e)
      {
         // Start the slideshow
         this._initSlideshow();
      },

      /**
       * Initialise, or re-initialise the slideshow. This will load (or re-load) details
       * for the user as well as the  photo stream. This is called from onReady() as well
       * as when the dashlet configuration is changed.
       * 
       * @method _initSlideshow
       */
      _initSlideshow: function FlickrSlideshow__initSlideshow()
      {
         // Reset the slideshow
         this._stopTimer();
         this.photosContainer.innerHTML = "";
         this._resetCounter();
         
         // Load data
         if (this.options.userId != "")
         {
            this._loadUserDetails();
            Dom.setStyle(this.photosContainer, "display", "block");
            Dom.setStyle(this.id + "-message", "display", "none");
            this.loadPhotos();
         }
         else
         {
            this.userDetails = null;
            this.titleContainer.innerHTML = this.msg("header.default");
            this._displayMessage(this.msg("label.notConfigured"));
         }
      },
      
      /**
       * Initialise the photos carousel
       * 
       * @method _initCarousel
       */
      _initCarousel: function FlickrSlideshow__initCarousel()
      {
         var imgwidth = 75, imgheight = 75, imgborder = 1, imgpadding = 1, cpadding = 5, cbar = 5;
         // Remove any existing carousel items
         if (typeof this.widgets.carousel != "undefined" && this.widgets.carousel != null)
         {
             this.widgets.carousel.hide();
             this.widgets.carousel.clearItems();
             this.widgets.carousel.unsubscribeAll("itemSelected");
         }
         var cEl = this.widgets.carouselEl;
         if (cEl !== null)
         {
            if (Dom.getStyle(cEl.parentNode, "display") == "none")
            {
                // Set the height of the photos container to leave space for the carousel
                var bdregion = Dom.getRegion(this.bodyContainer), // dashlet body region
                   cregion = Dom.getRegion(this.photosContainer),
                   cheight = cregion.bottom - cregion.top,
                   cwidth = cregion.right - cregion.left,
                   cbodyheight = imgheight + imgborder*2 + imgpadding*2 + cpadding*2;
                
                if (this.options.carouselEnabled === true)
                {
                   Dom.setStyle(this.photosContainer, "height", (cheight - (cbodyheight + cbar)) + "px");
                   Dom.setStyle(cEl, "display", "block");
                }
                else
                {
                   Dom.setStyle(this.photosContainer, "height", (cheight - cbar) + "px");
                   Dom.setStyle(cEl, "display", "none");
                }
                
                var barEl = Dom.get(this.id + "-carousel-bar");
                if (barEl != null)
                {
                    Event.addListener(barEl, "click", this.onCarouselClick, null, this);
                }
                
                Dom.setStyle(cEl.parentNode, "display", "block");
            }
         }
         this._createCarousel();
      },
      
      /**
       * Create the photos carousel widget
       * 
       * @method _createCarousel
       */
      _createCarousel: function FlickrSlideshow__createCarousel()
      {
         var imgwidth = 75, imgheight = 75, imgborder = 1, imgpadding = 1, cpadding = 5, cbar = 5;
         var cregion = Dom.getRegion(this.photosContainer),
             cwidth = cregion.right - cregion.left,
             numVisible = Math.floor(cwidth/(imgwidth + imgborder*2 + imgpadding*2)),
             margin = Math.floor((cwidth - numVisible * (imgwidth + imgborder*2 + imgpadding*2)) / 2);
         
         if (typeof this.widgets.carousel == "undefined" || this.widgets.carousel == null)
         {
            var carousel = new YAHOO.widget.Carousel(this.widgets.carouselEl, {
               animation: { speed: 0.5 },
               numVisible: numVisible
            });
            this.widgets.carousel = carousel;
         }
            
         if (this.widgets.carousel.getItems().length == 0)
         {
            // Populate the carousel items
            for (var i = 0; i < this.photos.length; i++)
            {
                this.widgets.carousel.addItem(this._getPhotoHTML(this.photos[i], "s"));
            }
         }
            
         this.widgets.carousel.subscribe("itemSelected", function (index) {
            this._stopTimer();
            this._setCounter(index);
            this.rotatePhoto();
         }, this, true);

         this.widgets.carousel.render(); // get ready for rendering the widget
         this.widgets.carousel.show();   // display the widget

         Dom.setStyle(this.widgets.carouselEl, "padding-left", margin + "px");

         this._scrollCarousel(this.slideshowPos - 1);
      },

      /**
       * Display a message to the user
       * 
       * @method _displayMessage
       * @param msg {string} Message to display
       */
      _displayMessage: function FlickrSlideshow__displayMessage(msg)
      {
         Dom.setStyle(this.photosContainer, "display", "none");
         Dom.setStyle(this.messageContainer, "display", "block");
         this.messageContainer.innerHTML = msg;
         this._centerElement(this.messageContainer, this.bodyContainer);
         Dom.setStyle(this.messageContainer, "visibility", "visible");
      },

      /**
       * Load details about the current user from the API and update the 
       * dashlet contents.
       * 
       * @method _loadUserDetails
       */
      _loadUserDetails: function FlickrSlideshow__loadUserDetails()
      {
         // Load the search results
         Alfresco.util.Ajax.request(
         {
            url: Alfresco.constants.URL_SERVICECONTEXT + "modules/flickr/api",
            dataObj:
            {
               apiKey: this.options.apiKey,
               method: METHOD_PEOPLE_GET_INFO,
               user_id: this.options.userId
            },
            successCallback:
            {
               fn: this.onUserDetailsLoaded,
               scope: this
            },
            failureCallback:
            {
               fn: this.onUserDetailsFailed,
               scope: this
            },
            scope: this,
            noReloadOnAuthFailure: true
         });
      },
      
      /**
       * User details loaded successfully
       * 
       * @method onUserDetailsLoaded
       * @param p_response {object} Response object from request
       */
      onUserDetailsLoaded: function FlickrSlideshow_onUserDetailsLoaded(p_response)
      {
         if (p_response.json && p_response.json.stat == "ok")
         {
            this.userDetails = p_response.json.person;
            if (this.userDetails.username)
            {
               this.titleContainer.innerHTML = this.msg("header.user", this.userDetails.photosurl._content, this.userDetails.username._content);
            }
            else
            {
               this.titleContainer.innerHTML = this.msg("header.default");
            }
         }
         else
         {
            this.titleContainer.innerHTML = this.msg("header.default");
         }
      },

      /**
       * User details load failed
       * 
       * @method onUserDetailsFailed
       */
      onUserDetailsFailed: function FlickrSlideshow_onUserDetailsFailed()
      {
         this.searchResults.innerHTML = '<div class="detail-list-item first-item last-item">' + this.msg("label.error") + '</div>';
      },

      /**
       * Load the photos
       * 
       * @method refreshResults
       */
      loadPhotos: function FlickrSlideshow_loadPhotos()
      {
         // Load the search results
         Alfresco.util.Ajax.request(
         {
            url: Alfresco.constants.URL_SERVICECONTEXT + "modules/flickr/api",
            dataObj:
            {
               apiKey: this.options.apiKey,
               method: this._getFlickrMethod(),
               perPage: this.options.numPhotos,
               count: this.options.numPhotos, // Used by flickr.photos.getContactsPublicPhotos
               page: 0,
               user_id: this.options.userId
            },
            successCallback:
            {
               fn: this.onPhotosLoaded,
               scope: this
            },
            failureCallback:
            {
               fn: this.onPhotosFailed,
               scope: this
            },
            scope: this,
            noReloadOnAuthFailure: true
         });
      },

      /**
       * Return the full name of the Flickr method to use, based on the stream type configured for the object.
       * 
       * @method getStreamType
       * @private
       * @return {string} Full name of the Flickr method, or null if no matching stream type is defined
       */
      _getFlickrMethod: function FlickrSlideshow__getFlickrMethod()
      {
         if (this.options.streamType === "user")
         {
            return METHOD_GET_PUBLIC_PHOTOS;
         }
         else if (this.options.streamType === "contacts")
         {
            return METHOD_GET_CONTACTS_PUBLIC_PHOTOS;
         }
         else if (this.options.streamType === "favorites")
         {
            return METHOD_GET_FAVORITES_PUBLIC_PHOTOS;
         }
         else
         {
            return null;
         }
      },
      
      /**
       * Photos loaded successfully
       * 
       * @method onPhotosLoaded
       * @param p_response {object} Response object from request
       */
      onPhotosLoaded: function FlickrSlideshow_onPhotosLoaded(p_response)
      {
         if (p_response.json && p_response.json.stat == "ok")
         {
            this.photos = p_response.json.photos.photo;
            if (this.photos.length > 0)
            {
               this.rotatePhoto();
               this._initCarousel();
            }
            else
            {
               this._displayMessage(this.msg("message.noPhotos"));
            }
         }
      },

      /**
       * Photos load failed
       * 
       * @method onPhotosFailed
       */
      onPhotosFailed: function FlickrSlideshow_onPhotosFailed()
      {
         this.searchResults.innerHTML = '<div class="detail-list-item first-item last-item">' + this.msg("label.error") + '</div>';
      },

      /**
       * Get the URL for a specified photo
       * 
       * @method _getPhotoURL
       * @private
       * @param p_obj {object} Photo object received from JSON API
       * @param size {string} Size required, e.g. s, t, m, -, z, b, o. Defaults to medium (-) if not given
       * @return {string} The photo image URL
       */
      _getPhotoURL: function FlickrSlideshow__getPhotoURL(p_obj, size)
      {
         size = size !== undefined ? size : "-";
         return "http://farm" + p_obj.farm + ".static.flickr.com/" + p_obj.server + "/" + p_obj.id + "_" + p_obj.secret + (size != "-" ? "_" + size : "") + ".jpg";
      },

      /**
       * Build HTML for a specified photo
       * 
       * @method _getPhotoHTML
       * @private
       * @param p_obj {object} Photo object received from JSON API
       * @param size {string} Size required, e.g. s, t, m, -, z, b, o. Defaults to medium (-) if not given
       * @return {string} The photo markup
       */
      _getPhotoHTML: function FlickrSlideshow__getPhotoHTML(p_obj, size)
      {
         return "<img src=\"" + this._getPhotoURL(p_obj, size) + "\"" + 
           // typeof(p_obj['description']) != "undefined" ? " title=\"" + p_obj['description']._content + "\"" : "" +
           (size == "s" ? " height=\"75\" width=\"75\"" : "") +
           " />";
      },

      /**
       * Get the maximum allowable size of photos
       * 
       * @method _getPhotoSize
       * @private
       * @param p_obj {object} Photo object received from JSON API
       * @return {string} The size of Flickr photos that will fit in the width photos container div
       */
      _getPhotoSize: function FlickrSlideshow__getPhotoSize(p_obj)
      {
         var region = Dom.getRegion(this.photosContainer),
            cwidth = region.right - region.left;
         
         if (cwidth >= 640)
         {
            return "z";
         }
         else if (cwidth >= 500)
         {
            return "-";
         }
         else if (cwidth >= 240)
         {
            return "m";
         }
         else
         {
            return "t";
         }
      },

      /**
       * Generate a title for this photo, based on the title metadata property
       * and the name of the owner.
       * 
       * @method _getPhotoTitle
       * @private
       * @param p_obj {object} Photo object received from JSON API
       * @param html {boolean} Should HTML be inserted into the title
       * @return {string} The title text to use
       */
      _getPhotoTitle: function FlickrSlideshow__getPhotoTitle(p_obj, html)
      {
         if (html)
         {
            return this.msg("photo.title", 
                  p_obj.title ? "<a href=\"" + this._getPhotoUrl(p_obj) + "\">" + p_obj.title + "</a>" : this.msg("photo.untitled"), 
                        (p_obj.username ? "<a href=\"" + this._getUserPhotosUrl(p_obj) + "\">" + p_obj.username + "</a>" : ((this.options.streamType == "user" && this.userDetails.username) ? "<a href=\"" + this.userDetails.photosurl._content + "\">" + this.userDetails.username._content + "</a>" : this.msg("photo.unknownUser"))));
         }
         else
         {
            return this.msg("photo.title", 
                  p_obj.title ? p_obj.title : this.msg("photo.untitled"), 
                        (p_obj.username ? p_obj.username : ((this.options.streamType == "user" && this.userDetails.username) ? this.userDetails.username._content : this.msg("photo.unknownUser"))));
         }
      },

      /**
       * Generate the public URL for a photo
       * 
       * @method _getPhotoUrl
       * @private
       * @param p_obj {object} Photo object received from JSON API
       * @return {string} The photo URL
       */
      _getPhotoUrl: function FlickrSlideshow__getPhotoUrl(p_obj)
      {
         return "http://www.flickr.com/photos/" + encodeURIComponent(p_obj.owner) + "/" + encodeURIComponent(p_obj.id) + "/";
      },

      /**
       * Generate the public URL for a user's photos page
       * 
       * @method _getUserPhotosUrl
       * @private
       * @param p_obj {object} Photo object received from JSON API
       * @return {string} The photos page URL
       */
      _getUserPhotosUrl: function FlickrSlideshow__getUserPhotosUrl(p_obj)
      {
         return "http://www.flickr.com/photos/" + encodeURIComponent(p_obj.owner) + "/";
      },
      
      /**
       * Display a new photo in the dashlet body. If other photos are already present, they should
       * be faded out and removed.
       * 
       * @method _addPhoto
       * @private
       * @param p_obj {object} Photo object to show
       */
      _addPhoto: function FlickrSlideshow__addPhoto(p_obj)
      {
         // Create the new div
         var imgDiv = document.createElement('div');
         // Create the new image
         var imgEl = document.createElement('img');
         Dom.setAttribute(imgEl, "src", this._getPhotoURL(p_obj, this._getPhotoSize(p_obj)));
         var title = this._getPhotoTitle(p_obj, false);
         Dom.setAttribute(imgEl, "alt", title);
         Dom.setStyle(imgDiv, "opacity", "0");
         Dom.setStyle(imgDiv, "visibility", "hidden");

         imgDiv.appendChild(imgEl);
         
         // Fade in the image when it has finished loading
         Event.addListener(imgEl, "load", this.onPhotoLoad, {el: imgEl, photo: p_obj}, this);
         
         // Stop the timer on mouseover and restart on mouseout
         Event.addListener(imgEl, "mouseover", this.onPhotoMouseover, null, this);
         Event.addListener(imgEl, "mouseout", this.onPhotoMouseout, null, this);
         Event.addListener(imgEl, "click", this.rotatePhoto, null, this);
         
         // Insert into the document
         this.photosContainer.appendChild(imgDiv);
      },

      /**
       * Center one element inside another
       * 
       * @method _centerElement
       * @private
       * @param el {HTMLElement} Element to center
       * @param parentEl {HTMLElement} Parent element
       */
      _centerElement: function FlickrSlideshow__centerElement(el, parentEl)
      {
         var pregion = Dom.getRegion(parentEl),
            pheight = pregion.bottom - pregion.top,
            pwidth = pregion.right - pregion.left;
         var elregion = Dom.getRegion(el);
         var elwidth = elregion.right - elregion.left;
         var elheight = elregion.bottom - elregion.top;
         var xOffset = Math.round((parseInt(pwidth) - parseInt(elwidth))/2);
         var yOffset = Math.round((parseInt(pheight) - parseInt(elheight))/2);
         
         Dom.setStyle(parentEl, "overflow", "hidden");
         Dom.setStyle(el, "position", "relative");
         Dom.setStyle(el, "top", "" + yOffset + "px");
      },

      /**
       * Overlay one element on top of another
       * 
       * @method _overlayElement
       * @private
       * @param el {HTMLElement} Element to overlay
       * @param parentEl {HTMLElement} Reference element
       * @param setWidth {boolean} Whether to set the element's width to 100% of the container. Defaults to true.
       * @param setHeight {boolean} Whether to set the element's height to 100% of the container. Defaults to true.
       */
      _overlayElement: function FlickrSlideshow__overlayElement(el, parentEl, setXY, setWidth, setHeight)
      {
         if (setWidth === null)
         {
            setWidth = true;
         }
         if (setHeight === null)
         {
            setHeight = true;
         }
         var pregion = Dom.getRegion(parentEl),
            pheight = pregion.bottom - pregion.top,
            pwidth = pregion.right - pregion.left;
         var elregion = Dom.getRegion(el);
         var elwidth = elregion.right - elregion.left;
         var elheight = elregion.bottom - elregion.top;
         
         if (setXY)
         {
            Dom.setXY(el, Dom.getXY(parentEl));
         }
         if (setWidth === true)
         {
            Dom.setStyle(el, "width", "100%");
            //Dom.setStyle(el, "width", pwidth + "px");
            //Dom.setStyle(el, "max-width", Dom.getStyle(parentEl, "width"));
         }
         if (setHeight === true)
         {
            Dom.setStyle(el, "height", "" + pheight + "px");
         }
      },

      /**
       * Get the currently-displayed photo
       * 
       * @method _getCurrentPhoto
       * @private
       * @return {HTMLElement} The currently-displayed photo, or null if there is not one present
       */
      _getCurrentPhoto: function FlickrSlideshow__getCurrentPhoto()
      {
         //return Dom.getLastChildBy(this.photosContainer, function(el) { Dom.getStyle(el, "z-index") == "1" });
         return Dom.getLastChild(this.photosContainer);
      },

      /**
       * Get any faded-out photos which are still on the page
       * 
       * @method _getExpiredPhotos
       * @private
       * @return {Array} The HTMLElement objects representing the expired photos
       */
      _getExpiredPhotos: function FlickrSlideshow__getExpiredPhotos()
      {
         if (this.photosContainer.childNodes.length > 1)
         {
            //return Dom.getChildrenBy(this.photosContainer, function(el) { Dom.getStyle(el, "opacity") == "0" });
            return [ Dom.getFirstChild(this.photosContainer) ];
         }
         else
         {
            return [];
         }
      },

      /**
       * Go to the next photo in the slideshow. This is executed initially by
       * the initial success callback and subsequently by the timer object or 
       * mouse click events.
       * 
       * @method rotatePhoto
       */
      rotatePhoto: function FlickrSlideshow_rotatePhoto()
      {
         // First remove already faded-out photos (opacity = 0)
         var oldImgs = this._getExpiredPhotos();
         for (var i = 0; i < oldImgs.length; i++)
         {
            this.photosContainer.removeChild(oldImgs[i]);
         }
         
         // Transition in the new photo
         this._addPhoto(this.photos[this.slideshowPos]);
         
         // Increment the counter
         this._incrementCounter();
      },

      /**
       * Function used to animate in a new photo
       * 
       * @property animateInFn
       * @param el {HTMLElement} Element to animate
       * @type function
       */
      animateIn: function FlickrSlideshow_animateInFn(el) {
         (new YAHOO.util.Anim(el, {
            opacity: {
               to: 1
            }
         }, 1, YAHOO.util.Easing.easeNone)).animate();
      },

      /**
       * Function used to animate out an expired photo
       * 
       * @property animateOutFn
       * @param el {HTMLElement} Element to animate
       * @type function
       */
      animateOut: function FlickrSlideshow_animateOutFn(el) {
         (new YAHOO.util.Anim(el, {
            opacity: {
               from: 1,
               to: 0
            }
         }, 1, YAHOO.util.Easing.easeNone)).animate();
      },

      /**
       * Increment the slideshow counter
       * 
       * @method _incrementCounter
       * @private
       */
      _incrementCounter: function FlickrSlideshow__incrementCounter()
      {
         if (this.slideshowPos < this.photos.length - 1)
         {
            this.slideshowPos ++;
         }
         else
         {
            this.slideshowPos = 0;
         }
      },

      /**
       * Decrement the slideshow counter
       * 
       * @method _decrementCounter
       * @private
       */
      _decrementCounter: function FlickrSlideshow__decrementCounter()
      {
         if (this.slideshowPos > 0)
         {
            this.slideshowPos --;
         }
         else
         {
            this.slideshowPos = this.photos.length - 1;
         }
      },

      /**
       * Reset the slideshow counter to zero
       * 
       * @method _resetCounter
       * @private
       */
      _resetCounter: function FlickrSlideshow__resetCounter()
      {
         this.slideshowPos = 0;
      },

      /**
       * Set the slideshow counter to a specific value
       * 
       * @method _setCounter
       * @private
       * @param i {int} Value to set the counter to
       */
      _setCounter: function FlickrSlideshow__setCounter(i)
      {
         this.slideshowPos = i;
      },

      /**
       * Reset the slideshow timer
       * 
       * @method _resetTimer
       * @private
       */
      _resetTimer: function FlickrSlideshow__resetTimer()
      {
         this._stopTimer();
         // Schedule next transition
         if (this.options.slideshowPeriod > 0)
         {
            this.timer = YAHOO.lang.later(this.options.slideshowPeriod, this, this.rotatePhoto);
         }
      },

      /**
       * Stop the slideshow timer
       * 
       * @method _stopTimer
       * @private
       */
      _stopTimer: function FlickrSlideshow__stopTimer()
      {
         if (this.timer != null)
         {
            this.timer.cancel();
         }
      },

      /**
       * Scroll the carousel, if it exists, to the current slideshow position
       * 
       * @method _scrollCarousel
       * @private
       */
      _scrollCarousel: function FlickrSlideshow__scrollCarousel(pos)
      {
          pos = (typeof pos != "undefined") ? pos : this.slideshowPos;
          if (typeof this.widgets.carousel != "undefined")
          {
              var nv = parseInt(this.widgets.carousel.get("numVisible")),
                  cpos = pos - Math.floor(nv / 2);
              if (cpos < 0)
              {
                  cpos = 0;
              }
              else if ((cpos + nv) > (this.photos.length - 1))
              {
                  cpos = this.photos.length - nv;
              }
              this.widgets.carousel.scrollTo(cpos, true);
              Dom.removeClass(this.widgets.carousel.getElementForItems(), "yui-carousel-item-selected");
              Dom.addClass(this.widgets.carousel.getElementForItem(pos), "yui-carousel-item-selected");
          }
      },

      /**
       * YUI WIDGET EVENT HANDLERS
       * Handlers for standard events fired from YUI widgets, e.g. "click"
       */

      /**
       * Configuration click handler
       *
       * @method onConfigClick
       * @param e {object} HTML event
       */
      onConfigClick: function FlickrSlideshow_onConfigClick(e)
      {
         var actionUrl = Alfresco.constants.URL_SERVICECONTEXT + "modules/dashlets/flickr-slideshow/config/" + encodeURIComponent(this.options.componentId);
         
         Event.stopEvent(e);
         
         if (!this.configDialog)
         {
            this.configDialog = new Alfresco.module.SimpleDialog(this.id + "-configDialog").setOptions(
            {
               width: "30em",
               templateUrl: Alfresco.constants.URL_SERVICECONTEXT + "modules/dashlets/flickr-slideshow/config", actionUrl: actionUrl,
               onSuccess:
               {
                  fn: function FlickrSlideshow_onConfigFeed_callback(response)
                  {
                     if (this.options.userId != response.json.user.id)
                     {
                        // Update local userId value and reload photos
                        this.options.userId = response.json.user.id;
                        this._initSlideshow();
                     }
                  },
                  scope: this
               },
               doSetupFormsValidation:
               {
                  fn: function FlickrSlideshow_doSetupForm_callback(form)
                  {
                     // Set the username form field value from the local setting
                     Dom.get(this.configDialog.id + "-userId").value = (this.userDetails && this.userDetails.username) ? this.userDetails.username._content : this.options.userId;
                  },
                  scope: this
               }
            });
         }
         else
         {
            this.configDialog.setOptions(
            {
               actionUrl: actionUrl
            })
         }
         this.configDialog.show();
      },

      /**
       * Executed when the image has loaded. We need to wait until loading has
       * finished so that we can position the photo according to its dimensions
       * and start to fade it in.
       * 
       * @method onPhotoLoad
       * @param event {object} HTML event
       * @param imgEl {HTMLElement} Image element that has been loaded
       */
      onPhotoLoad: function FlickrSlideshow_onPhotoLoad(event, obj)
      {
         var divEl = obj.el.parentNode; // Photo wrapper div
         
         // Overlay div on top of photos container
         this._overlayElement(divEl, this.photosContainer, true, true, true);

         // Centre the photo vertically
         this._centerElement(obj.el, divEl);

         // Make the photo visible
         Dom.setStyle(divEl, "visibility", "visible");
         
         // Fade in the new image
         this.animateIn(divEl);

         // Fade out any old image(s)
         var prevEl = Dom.getPreviousSibling(divEl);
         while (prevEl != null)
         {
            this.animateOut(prevEl);
            prevEl = Dom.getPreviousSibling(prevEl);
         }
         
         // Update the photo title in the overlay
         this.overlayTitleContainer.innerHTML = this._getPhotoTitle(obj.photo, true);
         
         // Scroll carousel, if enabled
         this._scrollCarousel(this.slideshowPos > 0 ? this.slideshowPos - 1 : this.photos.length - 1);
         
         // Schedule next transition
         this._resetTimer();
      },

      /**
       * Executed when the user moves their cursor over the current photo.
       * 
       * @method onPhotoMouseover
       * @param event {object} HTML event
       * @param el {HTMLElement} Element that triggered the mouseover event
       */
      onPhotoMouseover: function FlickrSlideshow_onPhotoMouseover(event, el)
      {
         this._stopTimer();
         // Show the overlay
         Dom.setStyle(this.overlayContainer, "visibility", "visible");
      },

      /**
       * Executed when the user moves their cursor off the current photo.
       * 
       * @method onPhotoMouseout
       * @param event {object} HTML event
       * @param el {HTMLElement} Element that triggered the mouseout event
       */
      onPhotoMouseout: function FlickrSlideshow_onPhotoMouseout(event, el)
      {
         // Hide the overlay
         Dom.setStyle(this.overlayContainer, "visibility", "hidden");
         this._resetTimer();
      },

      /**
       * Carousel click handler. Executed when a user clicks on the carousel to hide/show it.
       *
       * @method onCarouselClick
       * @param e {object} HTML event
       */
      onCarouselClick: function  FlickrSlideshow_onCarouselClick(event, el)
      {
          var ccregion = Dom.getRegion(this.widgets.carouselEl),
              ccheight = ccregion.bottom - ccregion.top,
              pcregion = Dom.getRegion(this.photosContainer),
              pcheight = pcregion.bottom - pcregion.top;
          
          var oldDisplay = Dom.getStyle(this.widgets.carouselEl, "display") || "block";
          var display = oldDisplay == "block" ? "none" : "block";
          Dom.setStyle(this.widgets.carouselEl, "display", display);
          if (display == "none")
          {
              Dom.setStyle(this.photosContainer, "height", (pcheight + ccheight) + "px");
          }
          else
          {
              this._createCarousel();
              ccregion = Dom.getRegion(this.widgets.carouselEl); // Refresh region info
              ccheight = ccregion.bottom - ccregion.top;
              Dom.setStyle(this.photosContainer, "height", "" + (pcheight - ccheight) + "px");
          }
          
          // Re-position the photos inside the resized photo container
          for (var i = 0; i < this.photosContainer.childNodes.length; i++)
          {
             var divEl = this.photosContainer.childNodes[i];
             this._overlayElement(divEl, this.photosContainer, true, true, true);
             this._centerElement(divEl.firstChild, divEl);
          }
          
          // Persist carousel state to the dashlet config
          Alfresco.util.Ajax.jsonRequest(
          {
              method: "POST",
              url: Alfresco.constants.URL_SERVICECONTEXT + "modules/dashlet/config/" + this.options.componentId,
              dataObj:
              {
                  carouselEnabled: display == "block"
              },
              successCallback: function(){},
              successMessage: null,
              failureCallback: function(){},
              failureMessage: null
          });
       }
      
   });
})();
