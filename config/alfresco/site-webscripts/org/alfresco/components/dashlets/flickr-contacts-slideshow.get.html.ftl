<script type="text/javascript">//<![CDATA[
(function()
{
   var dashlet = new Alfresco.dashlet.FlickrSlideshow("${args.htmlid}").setOptions(
   {
      "componentId": "${instance.object.id}",
      "userId": "${args.userId!''}",
      "numPhotos": "${numPhotos!50}",
      "streamType": "contacts",
      "carouselEnabled": ${(args.carouselEnabled!true)?string}
   }).setMessages(
      ${messages}
   );
   var resizer = new Alfresco.widget.DashletResizer("${args.htmlid}", "${instance.object.id}");
   // Add end resize event handler
   var timer = YAHOO.lang.later(1000, this, function(dashlet, resizer) {
      if (resizer.widgets.resizer)
      {
         resizer.widgets.resizer.on("endResize", function(eventTarget)
         {
            dashlet.onEndResize(eventTarget.height);
         }, dashlet, true);
         timer.cancel();
      }
   }, [dashlet, resizer], true);
   
   var editDashletEvent = new YAHOO.util.CustomEvent("onDashletConfigure");
   editDashletEvent.subscribe(dashlet.onConfigClick, dashlet, true);

   new Alfresco.widget.DashletTitleBarActions("${args.htmlid}").setOptions(
   {
      actions:
      [
<#if hasConfigPermission>
         {
            cssClass: "edit",
            eventOnClick: editDashletEvent,
            tooltip: "${msg("dashlet.edit.tooltip")?js_string}"
         },
</#if>
         {
            cssClass: "help",
            bubbleOnClick:
            {
               message: "${msg("dashlet.help")?js_string}"
            },
            tooltip: "${msg("dashlet.help.tooltip")?js_string}"
         }
      ]
   });
})();
//]]></script>

<div class="dashlet flickr-slideshow-dashlet">
   <#if args.userName??>
   <div class="title" id="${args.htmlid}-title">&nbsp;</div>
   <#else>
   <div class="title" id="${args.htmlid}-title">${msg("header.default")}</div>
   </#if>
   <div id="${args.htmlid}-body" class="body" <#if args.height??>style="height: ${args.height}px;"</#if>>
      <div id="${args.htmlid}-overlay" class="photo-overlay">
         <div id="${args.htmlid}-overlay-title" class="photo-title"></div>
      </div>
      <div id="${args.htmlid}-photos" class="photos"></div>
      <div id="${args.htmlid}-message" class="message"></div>
      <div id="${args.htmlid}-ccontainer" class="ccontainer" style="display: none;">
      	<div id="${args.htmlid}-carousel-bar" class="carousel-bar"></div>
      	<div id="${args.htmlid}-carousel" class="carousel"><ol></ol></div>
   	</div>
   </div>
</div>