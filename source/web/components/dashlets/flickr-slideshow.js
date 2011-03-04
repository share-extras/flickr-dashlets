/**
 * Copyright (C) 2005-2009 Alfresco Software Limited.
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.

 * As a special exception to the terms and conditions of version 2.0 of 
 * the GPL, you may redistribute this Program in connection with Free/Libre 
 * and Open Source Software ("FLOSS") applications as described in Alfresco's 
 * FLOSS exception.  You should have recieved a copy of the text describing 
 * the FLOSS exception, and it is also available here: 
 * http://www.alfresco.com/legal/licensing
 */
 
/**
 * Flickr slideshow dashlet.
 * 
 * @namespace Alfresco
 * @class Alfresco.dashlet.FlickrSlideshow
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
      return Alfresco.dashlet.FlickrSlideshow.superclass.constructor.call(this, "Alfresco.dashlet.FlickrSlideshow", htmlId, [ "animation" ]);
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
          * The component id.
          *
          * @property componentId
          * @type string
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
          * Time in milliseconds between photos
          * 
          * @property slideshowPeriod
          * @type int
          * @default 5000
          */
         slideshowPeriod: 5000
      },

      /**
       * Body DOM container.
       * 
       * @property bodyContainer
       * @type object
       */
      bodyContainer: null,

      /**
       * Photos DOM container.
       * 
       * @property photosContainer
       * @type object
       */
      photosContainer: null,

      /**
       * User message DOM container.
       * 
       * @property messageContainer
       * @type object
       */
      messageContainer: null,

      /**
       * Dashlet title DOM container.
       * 
       * @property titleContainer
       * @type object
       */
      titleContainer: null,

      /**
       * Photo objects loaded via JSON.
       * 
       * @property photos
       * @type object
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
         
         this.initSlideshow();
      },

      /**
       * Initialise, or re-initialise the slideshow. This will load (or re-load) details
       * for the user as well as the  photo stream. This is called from onReady() as well
       * as when the dashlet configuration is changed.
       * 
       * @method initSlideshow
       */
      initSlideshow: function FlickrSlideshow_initSlideshow()
      {
         // Reset the slideshow
         this.stopTimer();
         this.photosContainer.innerHTML = "";
         this.resetCounter();
         
         // Load the results
         if (this.options.userId != "")
         {
            this.loadUserDetails();
            Dom.setStyle(this.photosContainer, "display", "block");
            Dom.setStyle(this.id + "-message", "display", "none");
            this.loadPhotos();
         }
         else
         {
            this.userDetails = null;
            this.titleContainer.innerHTML = this.msg("header.default");
            this.displayMessage(this.msg("label.notConfigured"));
         }
      },

      /**
       * Display a message to the user
       * 
       * @method displayMessage
       * @param msg {string} Message to display
       */
      displayMessage: function FlickrSlideshow_displayMessage(msg)
      {
         Dom.setStyle(this.photosContainer, "display", "none");
         Dom.setStyle(this.messageContainer, "display", "block");
         this.messageContainer.innerHTML = msg;
         this.centerElement(this.messageContainer, this.bodyContainer);
         Dom.setStyle(this.messageContainer, "visibility", "visible");
      },

      /**
       * Load the user details
       * 
       * @method loadUserDetails
       */
      loadUserDetails: function FlickrSlideshow_loadUserDetails()
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
               method: this.getFlickrMethod(),
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
       * @return {string} Full name of the Flickr method, or null if no matching stream type is defined
       */
      getFlickrMethod: function FlickrSlideshow_getFlickrMethod()
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
            }
            else
            {
               this.displayMessage(this.msg("message.noPhotos"));
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
       * @method getPhotoURL
       * @param p_obj {object} Photo object received from JSON API
       * @param size {string} Size required, e.g. s, t, m, -, z, b, o. Defaults to medium (-) if not given
       * @return {string} The photo image URL
       */
      getPhotoURL: function FlickrSlideshow_getPhotoURL(p_obj, size)
      {
         size = size !== undefined ? size : "-";
         return "http://farm" + p_obj.farm + ".static.flickr.com/" + p_obj.server + "/" + p_obj.id + "_" + p_obj.secret + (size != "-" ? "_" + size : "") + ".jpg";
      },

      /**
       * Build HTML for a specified photo
       * 
       * @method getPhotoHTML
       * @param p_obj {object} Photo object received from JSON API
       * @param size {string} Size required, e.g. s, t, m, -, z, b, o. Defaults to medium (-) if not given
       * @return {string} The photo markup
       */
      getPhotoHTML: function FlickrSlideshow_getPhotoHTML(p_obj, size)
      {
         return "<img src=\"" + this.getPhotoURL(p_obj, size) + "\"" + 
           // typeof(p_obj['description']) != "undefined" ? " title=\"" + p_obj['description']._content + "\"" : "" +
           " />";
      },

      /**
       * Get the maximum allowable size of photos
       * 
       * @method getPhotoSize
       * @param p_obj {object} Photo object received from JSON API
       * @return {string} The size of Flickr photos that will fit in the width photos container div
       */
      getPhotoSize: function FlickrSlideshow_getPhotoSize(p_obj)
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
       * Display a new photo in the dashlet body. If other photos are already present, they should
       * be faded out and removed.
       * 
       * @method addPhoto
       * @param p_obj {object} Photo object to show
       */
      addPhoto: function FlickrSlideshow_addPhoto(p_obj)
      {
         // Create the new div
         var imgDiv = document.createElement('div');
         // Create the new image
         var imgEl = document.createElement('img');
         Dom.setAttribute(imgEl, "src", this.getPhotoURL(p_obj, this.getPhotoSize(p_obj)));
         var title = this.msg("photo.title", 
               p_obj.title ? p_obj.title : this.msg("photo.untitled"), 
                     (p_obj.username ? p_obj.username : ((this.options.streamType == "user" && this.userDetails.username) ? this.userDetails.username._content : this.msg("photo.unknownUser"))));
         Dom.setAttribute(imgEl, "title", title);
         Dom.setAttribute(imgEl, "alt", title);
         Dom.setStyle(imgDiv, "opacity", "0");
         Dom.setStyle(imgDiv, "visibility", "hidden");
         Dom.setStyle(imgDiv, "position", "absolute");

         imgDiv.appendChild(imgEl);
         
         // Fade in the image when it has finished loading
         Event.addListener(imgEl, "load", this.onLoadPhoto, imgEl, this);
         
         // Stop the timer on mouseover and restart on mouseout
         Event.addListener(imgEl, "mouseover", this.stopTimer, null, this);
         Event.addListener(imgEl, "mouseout", this.resetTimer, null, this);
         Event.addListener(imgEl, "click", this.rotatePhoto, null, this);
         
         // Insert into the document
         this.photosContainer.appendChild(imgDiv);
      },

      /**
       * Center one element inside another
       * 
       * @method centerElement
       * @param el {HTMLElement} Element to center
       * @param parentEl {HTMLElement} Parent element
       */
      centerElement: function FlickrSlideshow_centerElement(el, parentEl)
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
       * @method overlayElement
       * @param el {HTMLElement} Element to overlay
       * @param parentEl {HTMLElement} Reference element
       */
      overlayElement: function FlickrSlideshow_centerElement(el, parentEl)
      {
         var pregion = Dom.getRegion(parentEl),
            pheight = pregion.bottom - pregion.top,
            pwidth = pregion.right - pregion.left;
         var elregion = Dom.getRegion(el);
         var elwidth = elregion.right - elregion.left;
         var elheight = elregion.bottom - elregion.top;

         Dom.setXY(el, Dom.getXY(parentEl));
         Dom.setStyle(el, "width", "100%");
         Dom.setStyle(el, "max-width", Dom.getStyle(parentEl, "width"));
         Dom.setStyle(el, "height", "" + pheight + "px");
      },

      /**
       * Executed when the image has loaded. We need to wait until loading has
       * finished so that we can position the photo according to its dimensions
       * and start to fade it in.
       * 
       * @method onLoadPhoto
       * @param imgEl {HTMLElement} Image element that has been loaded
       */
      onLoadPhoto: function FlickrSlideshow_onLoadPhoto(event, imgEl)
      {
         var divEl = imgEl.parentNode; // Photo wrapper div
         
         // Overlay div on top of photos container
         this.overlayElement(divEl, this.photosContainer);

         // Centre the photo vertically
         this.centerElement(imgEl, divEl);

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
         
         // Schedule next transition
         this.resetTimer();
      },

      /**
       * Get the currently-displayed photo
       * 
       * @method getCurrentPhoto
       * @return {HTMLElement} The currently-displayed photo, or null if there is not one present
       */
      getCurrentPhoto: function FlickrSlideshow_getCurrentPhoto()
      {
         //return Dom.getLastChildBy(this.photosContainer, function(el) { Dom.getStyle(el, "z-index") == "1" });
         return Dom.getLastChild(this.photosContainer);
      },

      /**
       * Get any faded-out photos which are still on the page
       * 
       * @method getExpiredPhotos
       * @return {Array} The HTMLElement objects representing the expired photos
       */
      getExpiredPhotos: function FlickrSlideshow_getExpiredPhotos()
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
       * Go to the next photo in the slideshow
       * 
       * @method rotatePhoto
       */
      rotatePhoto: function FlickrSlideshow_rotatePhoto()
      {
         // First remove already faded-out photos (opacity = 0)
         var oldImgs = this.getExpiredPhotos();
         for (var i = 0; i < oldImgs.length; i++)
         {
            this.photosContainer.removeChild(oldImgs[i]);
         }
         
         // If there is an existing photo, reset its z-layer to 0
         var currImg = this.getCurrentPhoto();
         if (currImg != null)
         {
            //Dom.setStyle(currImg, "z-index", "0");
         }
         
         // Transition in the new photo
         this.addPhoto(this.photos[this.slideshowPos]);
         
         // Increment the counter
         this.incrementCounter();
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
       * @method incrementCounter
       */
      incrementCounter: function FlickrSlideshow_incrementCounter()
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
       * @method decrementCounter
       */
      decrementCounter: function FlickrSlideshow_decrementCounter()
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
       * @method resetCounter
       */
      resetCounter: function FlickrSlideshow_resetCounter()
      {
         this.slideshowPos = 0;
      },

      /**
       * Reset the slideshow timer
       * 
       * @method resetCounter
       */
      resetTimer: function FlickrSlideshow_resetTimer()
      {
         this.stopTimer();
         // Schedule next transition
         this.timer = YAHOO.lang.later(this.options.slideshowPeriod, this, this.rotatePhoto);
      },

      /**
       * Stop the slideshow timer
       * 
       * @method stopTimer
       */
      stopTimer: function FlickrSlideshow_stopTimer()
      {
         if (this.timer != null)
         {
            this.timer.cancel();
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
                        this.initSlideshow();
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
      }
      
   });
})();
