/*******************************************************************/
/*                                                                 */
/*                      ADOBE CONFIDENTIAL                         */
/*                   _ _ _ _ _ _ _ _ _ _ _ _ _                     */
/*                                                                 */
/* Copyright 2007-2023 Adobe Inc.                                  */
/* All Rights Reserved.                                            */
/*                                                                 */
/* NOTICE:  All information contained herein is, and remains the   */
/* property of Adobe Inc. and its suppliers, if                    */
/* any.  The intellectual and technical concepts contained         */
/* herein are proprietary to Adobe Inc. and its                    */
/* suppliers and may be covered by U.S. and Foreign Patents,       */
/* patents in process, and are protected by trade secret or        */
/* copyright law.  Dissemination of this information or            */
/* reproduction of this material is strictly forbidden unless      */
/* prior written permission is obtained from Adobe Inc.            */
/* Incorporated.                                                   */
/*                                                                 */
/*******************************************************************/

/*
	Skeleton.h
*/

#pragma once

#ifndef SKELETON_H
#define SKELETON_H

typedef unsigned char		u_char;
typedef unsigned short		u_short;
typedef unsigned short		u_int16;
typedef unsigned long		u_long;
typedef short int			int16;
#define PF_TABLE_BITS	12
#define PF_TABLE_SZ_16	4096

#define PF_DEEP_COLOR_AWARE 1	// make sure we get 16bpc pixels; 
								// AE_Effect.h checks for this.

#include "AEConfig.h"

#ifdef AE_OS_WIN
	typedef unsigned short PixelType;
	#include <Windows.h>
#endif

#include "entry.h"
#include "AE_Effect.h"
#include "AE_EffectCB.h"
#include "AE_Macros.h"
#include "Param_Utils.h"
#include "AE_EffectCBSuites.h"
#include "String_Utils.h"
#include "AE_GeneralPlug.h"
#include "AEFX_ChannelDepthTpl.h"
#include "AEGP_SuiteHandler.h"

#include "Skeleton_Strings.h"

/* Versioning information */

#define	MAJOR_VERSION	1
#define	MINOR_VERSION	1
#define	BUG_VERSION		0
#define	STAGE_VERSION	PF_Stage_DEVELOP
#define	BUILD_VERSION	1

#define CF_TARGET_STATE_VERSION_MATCH_NAME		"Target State Version"
#define CF_TARGET_IDENTITY_VALID_MATCH_NAME		"Target Identity Valid"
#define CF_TARGET_LAYER_ID_MATCH_NAME			"Target Layer ID"
#define CF_TARGET_UNIQUE_STREAM_ID_MATCH_NAME	"Target Unique Stream ID"
#define CF_RECTANGLE_SNAPSHOT_VERSION_MATCH_NAME	"Rectangle Snapshot Version"
#define CF_RECTANGLE_SNAPSHOT_VALID_MATCH_NAME		"Rectangle Snapshot Valid"
#define CF_RECTANGLE_SNAPSHOT_SIZE_X_MATCH_NAME		"Rectangle Snapshot Size X"
#define CF_RECTANGLE_SNAPSHOT_SIZE_Y_MATCH_NAME		"Rectangle Snapshot Size Y"
#define CF_RECTANGLE_SNAPSHOT_POSITION_X_MATCH_NAME	"Rectangle Snapshot Position X"
#define CF_RECTANGLE_SNAPSHOT_POSITION_Y_MATCH_NAME	"Rectangle Snapshot Position Y"
#define CF_RECTANGLE_SNAPSHOT_ROUNDNESS_MATCH_NAME	"Rectangle Snapshot Roundness"
#define CF_RECTANGLE_SNAPSHOT_DIRECTION_MATCH_NAME	"Rectangle Snapshot Direction"
#define CF_RECTANGLE_SNAPSHOT_ENABLED_MATCH_NAME		"Rectangle Snapshot Enabled"

#define CF_GEOMETRY_TARGET_STATE_VERSION		1
#define CF_RECTANGLE_GEOMETRY_SNAPSHOT_VERSION	1

/* Parameter IDs */

	enum {
		CORNERFLEX_INPUT = 0,
		CORNERFLEX_LINK_TRIM,
		CORNERFLEX_TRIM,
		CORNERFLEX_TRIM_LEFT,
		CORNERFLEX_TRIM_TOP,
		CORNERFLEX_TRIM_RIGHT,
		CORNERFLEX_TRIM_BOTTOM,
		CORNERFLEX_TARGET_STATE_VERSION,
		CORNERFLEX_TARGET_IDENTITY_VALID,
		CORNERFLEX_TARGET_LAYER_ID,
		CORNERFLEX_TARGET_UNIQUE_STREAM_ID,
		CORNERFLEX_RECTANGLE_SNAPSHOT_VERSION,
		CORNERFLEX_RECTANGLE_SNAPSHOT_VALID,
		CORNERFLEX_RECTANGLE_SNAPSHOT_SIZE_X,
		CORNERFLEX_RECTANGLE_SNAPSHOT_SIZE_Y,
		CORNERFLEX_RECTANGLE_SNAPSHOT_POSITION_X,
		CORNERFLEX_RECTANGLE_SNAPSHOT_POSITION_Y,
		CORNERFLEX_RECTANGLE_SNAPSHOT_ROUNDNESS,
		CORNERFLEX_RECTANGLE_SNAPSHOT_DIRECTION,
		CORNERFLEX_RECTANGLE_SNAPSHOT_ENABLED,
		CORNERFLEX_NUM_PARAMS
	};

	enum {
		LINK_TRIM_DISK_ID = 1,
		TRIM_DISK_ID,
		TRIM_LEFT_DISK_ID,
		TRIM_TOP_DISK_ID,
		TRIM_RIGHT_DISK_ID,
		TRIM_BOTTOM_DISK_ID,
		TARGET_STATE_VERSION_DISK_ID = 7,
		TARGET_IDENTITY_VALID_DISK_ID,
		TARGET_LAYER_ID_DISK_ID,
		TARGET_UNIQUE_STREAM_ID_DISK_ID,
		RECTANGLE_SNAPSHOT_VERSION_DISK_ID = 11,
		RECTANGLE_SNAPSHOT_VALID_DISK_ID,
		RECTANGLE_SNAPSHOT_SIZE_X_DISK_ID,
		RECTANGLE_SNAPSHOT_SIZE_Y_DISK_ID,
		RECTANGLE_SNAPSHOT_POSITION_X_DISK_ID,
		RECTANGLE_SNAPSHOT_POSITION_Y_DISK_ID,
		RECTANGLE_SNAPSHOT_ROUNDNESS_DISK_ID,
		RECTANGLE_SNAPSHOT_DIRECTION_DISK_ID,
		RECTANGLE_SNAPSHOT_ENABLED_DISK_ID
	};

	typedef struct {
		PF_Boolean linkTrim;

		PF_FpLong trimLeft;
		PF_FpLong trimTop;
		PF_FpLong trimRight;
		PF_FpLong trimBottom;
	} CornerFlexSettings;

	typedef struct
	{
		PF_FpLong left;
		PF_FpLong top;
		PF_FpLong right;
		PF_FpLong bottom;

	} CF_Rect;

	typedef struct
	{
		PF_FpLong x;
		PF_FpLong y;

	} CF_Vector2;

	typedef struct
	{
		PF_FpLong a;
		PF_FpLong b;
		PF_FpLong c;
		PF_FpLong d;
		PF_FpLong tx;
		PF_FpLong ty;

	} CF_AffineTransform2D;

	typedef struct
	{
		CF_Rect bounds;
		PF_FpLong width;
		PF_FpLong height;
		PF_FpLong centerX;
		PF_FpLong centerY;

	} CF_RectangleGeometry;

	typedef struct
	{
		CF_Vector2 center;
		CF_Vector2 axisX;
		CF_Vector2 axisY;
		PF_FpLong halfWidth;
		PF_FpLong halfHeight;

	} CF_OrientedRectangle;

	// General affine rectangle foundation; basis vectors remain unnormalized.
	typedef struct
	{
		CF_Vector2 center;
		CF_Vector2 basisX;
		CF_Vector2 basisY;
		PF_FpLong halfWidth;
		PF_FpLong halfHeight;

	} CF_AffineRectangle;

	typedef struct
	{
		PF_FpLong topLeft;
		PF_FpLong topRight;
		PF_FpLong bottomRight;
		PF_FpLong bottomLeft;

	} CF_CornerRadii;

	// May include Rectangle Path, Bézier Path, and other geometry sources in the future.
	typedef enum
	{
		CF_GEOMETRY_SOURCE_LAYER_BOUNDS = 0,
		CF_GEOMETRY_SOURCE_RECTANGLE

	} CF_GeometrySource;

	typedef enum
	{
		CF_PRIMITIVE_UNKNOWN = 0,
		CF_PRIMITIVE_RECTANGLE,
		CF_PRIMITIVE_ELLIPSE,
		CF_PRIMITIVE_BEZIER,
		CF_PRIMITIVE_POLYGON,
		CF_PRIMITIVE_STAR,
		CF_PRIMITIVE_CUSTOM_PATH

	} CF_PrimitiveType;

	// Serializable identity captured by the After Effects integration layer.
	typedef struct
	{
		A_Boolean isValid;
		AEGP_LayerIDVal layerId;
		int32_t uniqueStreamId;

	} CF_GeometryTargetIdentity;

	// Versioned, pointer-free payload for a future per-instance transport channel.
	typedef struct
	{
		A_long version;
		CF_GeometryTargetIdentity targetIdentity;

	} CF_GeometryTargetState;

	typedef struct
	{
		A_Boolean wasFound;
		A_Boolean isRectanglePath;
		int32_t uniqueStreamId;

	} CF_GeometryTargetLocation;

	typedef struct
	{
		A_Boolean wasRead;
		PF_FpLong sizeX;
		PF_FpLong sizeY;
		PF_FpLong positionX;
		PF_FpLong positionY;
		PF_FpLong roundness;

	} CF_RectanglePathProperties;

	// Versioned, host-independent Rectangle Path values supplied by CEP.
	typedef struct
	{
		A_long version;
		A_Boolean isValid;
		PF_FpLong sizeX;
		PF_FpLong sizeY;
		PF_FpLong positionX;
		PF_FpLong positionY;
		PF_FpLong roundness;
		A_long direction;

	} CF_RectangleGeometrySnapshot;

	typedef struct
	{
		CF_Rect bounds;
		CF_AffineTransform2D layerTransform;
		A_Boolean hasLayerTransform;
		A_Boolean isAvailable;

	} CF_RectangleSourceData;

	// Maps Rectangle Path-local coordinates into the effect input buffer.
	typedef struct
	{
		A_long inputWidth;
		A_long inputHeight;
		PF_FpLong originX;
		PF_FpLong originY;
		A_Boolean isValid;

	} CF_RectangleCoordinateContext;

	// Host-derived 2D transform from layer space into composition space.
	typedef struct
	{
		A_Boolean isValid;
		PF_FpLong anchorX;
		PF_FpLong anchorY;
		PF_FpLong positionX;
		PF_FpLong positionY;
		PF_FpLong scaleX;
		PF_FpLong scaleY;
		PF_FpLong rotationDegrees;
		A_long compWidth;
		A_long compHeight;
		PF_FpLong translationX;
		PF_FpLong translationY;

	} CF_LayerTransform2DContext;

	typedef struct
	{
		A_long inputWidth;
		A_long inputHeight;
		CF_RectangleSourceData rectangleSource;

	} CF_GeometryResolveRequest;

	typedef struct
	{
		CF_Rect bounds;
		CF_AffineTransform2D layerTransform;
		CF_GeometrySource source;
		CF_PrimitiveType primitiveType;
		A_Boolean hasLayerTransform;
		A_Boolean isFallback;

	} CF_GeometrySourceData;

	typedef struct
	{
		CF_Rect geometryBounds;
		CF_AffineTransform2D layerTransform;
		CF_RectangleGeometry rectangleGeometry;
		CF_CornerRadii cornerRadii;
		CF_GeometrySource source;
		CF_PrimitiveType primitiveType;
		A_Boolean hasLayerTransform;
		A_Boolean isFallback;

	} CF_GeometryContext;

	typedef struct
	{
		CF_Rect geometryBounds;
		CF_OrientedRectangle orientedRect;
		A_Boolean hasOrientedRect;

		A_long inputWidth;
		A_long inputHeight;

	} CF_RenderContext;

	// Resolves the current Layer Bounds fallback before context construction.
	CF_GeometrySourceData
	ResolveLayerBoundsGeometry(
		A_long inputWidth,
		A_long inputHeight);

	// Resolves an available rectangle source without accessing the host.
	CF_GeometrySourceData
	ResolveRectangleGeometry(
		const CF_RectangleSourceData& rectangleSource);

	// Common entry point for geometry source resolution.
	CF_GeometrySourceData
	ResolveGeometrySource(
		const CF_GeometryResolveRequest& request);

	// Builds an immutable rectangle description from resolved bounds.
	CF_RectangleGeometry
	BuildRectangleGeometry(
		const CF_Rect& bounds);

	CF_Vector2
	TransformPoint2D(
		const CF_AffineTransform2D& transform,
		const CF_Vector2& point);

	PF_FpLong
	DotVector2(
		const CF_Vector2& a,
		const CF_Vector2& b);

	PF_FpLong
	LengthVector2(
		const CF_Vector2& vector);

	CF_Vector2
	NormalizeVector2(
		const CF_Vector2& vector);

	CF_AffineTransform2D
	MakeIdentityAffineTransform2D();

	CF_AffineTransform2D
	ComposeAffineTransform2D(
		const CF_AffineTransform2D& parent,
		const CF_AffineTransform2D& child);

	CF_AffineTransform2D
	BuildLayerTransform2D(
		const CF_RectangleCoordinateContext& coordinateContext,
		const CF_LayerTransform2DContext& layerTransformContext);

	CF_OrientedRectangle
	BuildAxisAlignedOrientedRectangle(
		const CF_Rect& bounds);

	CF_OrientedRectangle
	TransformOrientedRectangle(
		const CF_OrientedRectangle& rectangle,
		const CF_AffineTransform2D& transform);

	CF_Rect
	ComputeOrientedRectangleAABB(
		const CF_OrientedRectangle& rectangle);

	CF_AffineRectangle
	BuildAxisAlignedAffineRectangle(
		const CF_Rect& bounds);

	CF_AffineRectangle
	TransformAffineRectangle(
		const CF_AffineRectangle& rectangle,
		const CF_AffineTransform2D& transform);

	CF_Rect
	ComputeAffineRectangleAABB(
		const CF_AffineRectangle& rectangle);

	A_Boolean
	IsPointInsideAffineRectangle(
		const CF_AffineRectangle& rectangle,
		PF_FpLong x,
		PF_FpLong y);

	A_Boolean
	IsPointInsideOrientedRectangle(
		const CF_OrientedRectangle& rectangle,
		PF_FpLong x,
		PF_FpLong y);

	// Validates geometry data without modifying it or accessing the host.
	A_Boolean
	IsGeometryContextValid(
		const CF_GeometryContext& geometryContext);

	// Applies resolved Trim settings to geometry without rendering.
	CF_GeometryContext
	ExecuteTrimOperation(
		CF_GeometryContext geometryContext,
		const CornerFlexSettings& settings);

	// Coordinates geometry operations without accessing the renderer or host.
	CF_GeometryContext
	ExecuteGeometryPipeline(
		CF_GeometryContext geometryContext,
		const CornerFlexSettings& settings);

	CF_RenderContext
	BuildRenderContext(
		const CF_GeometryContext& geometryContext,
		A_long inputWidth,
		A_long inputHeight);

	CF_GeometryTargetState
	ReadGeometryTargetState(
		PF_ParamDef* params[]);

	CF_GeometryTargetIdentity
	GetActiveGeometryTargetIdentity(
		const CF_GeometryTargetState& targetState);

	CF_RectangleGeometrySnapshot
	MakeInvalidRectangleGeometrySnapshot();

	A_Boolean
	ValidateRectangleGeometrySnapshot(
		const CF_RectangleGeometrySnapshot& snapshot);

	CF_RectangleGeometrySnapshot
	ReadRectangleGeometrySnapshot(
		PF_ParamDef* params[]);

	A_Boolean
	IsRectangleSnapshotSourceEnabled(
		PF_ParamDef* params[]);

	CF_RectangleCoordinateContext
	BuildRectangleCoordinateContext(
		A_long inputWidth,
		A_long inputHeight);

	CF_Rect
	ConvertRectangleSnapshotToLocalBounds(
		const CF_RectangleGeometrySnapshot& snapshot);

	CF_Rect
	TransformLocalBoundsWithLayerTransform2D(
		const CF_Rect& localBounds,
		const CF_RectangleCoordinateContext& coordinateContext,
		const CF_LayerTransform2DContext& layerTransformContext);

	CF_RectangleSourceData
	TransformLocalBoundsToEffectSpace(
		const CF_Rect& localBounds,
		const CF_RectangleCoordinateContext& coordinateContext,
		const CF_LayerTransform2DContext& layerTransformContext);

	CF_RectangleSourceData
	ConvertRectangleGeometrySnapshotToSourceData(
		const CF_RectangleGeometrySnapshot& snapshot,
		const CF_RectangleCoordinateContext& coordinateContext,
		const CF_LayerTransform2DContext& layerTransformContext);

	CF_RectangleSourceData
	SelectRectangleSourceData(
		A_Boolean snapshotSourceEnabled,
		const CF_RectangleSourceData& snapshotSource,
		const CF_RectangleSourceData& discoveredSource);


extern "C" {

	DllExport
	PF_Err
	EffectMain(
		PF_Cmd			cmd,
		PF_InData		*in_data,
		PF_OutData		*out_data,
		PF_ParamDef		*params[],
		PF_LayerDef		*output,
		void			*extra);

}

#endif // SKELETON_H
